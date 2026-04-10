"use client"

import * as React from "react"
import {
  RefreshCwIcon,
  UserPlus2,
  Users2,
  ArrowLeft,
  ShieldAlert,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { useRouter, useParams } from "next/navigation"
import { useWorkspace } from "@/hooks/use-workspace"
import { useHasPermission } from "@/hooks/use-has-permission"
import { apiClient } from "@/lib/api-client"

import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OrgTabs } from "@/components/organization/org-tabs"
import { BulkDeleteTeamMemberDialog } from "@/components/organization/bulk-delete-team-member-dialog"
import { ActionBar } from "@/components/data-table/action-bar"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationTeamMemberColumns } from "@/components/organization/team-members-table-columns"
import { AssignTeamMemberDialog } from "@/components/organization/assign-team-member-dialog"
import { DeleteTeamMemberDialog } from "@/components/organization/delete-team-member-dialog"
import { DataTableFilterField } from "@/types/data-table"

export default function TeamMembersPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = Number(params.teamId)

  const { data: activeOrg, isLoading: isOrgPending } = useWorkspace()
  const canAssign = useHasPermission("organisation_team_member:assign")
  const canDelete = useHasPermission("organisation_team_member:delete")
  const canToggle = useHasPermission("organisation_team_member:toggle")

  const [members, setMembers] = React.useState<any[]>([])
  const [team, setTeam] = React.useState<any>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [memberToDelete, setMemberToDelete] = React.useState<any>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // 3. Data Table Hook
  const {
    table,
    onSearchChange,
    onFilterReset,
    search,
    filters,
    setFilters,
    page,
    perPage,
    sort,
  } = useDataTable({
    data: members,
    columns: React.useMemo(() => getOrganisationTeamMemberColumns({
      capabilities: { canDelete, canToggle },
      onRemove: (m) => handleRemoveMember(m),
      onToggleStatus: (m) => handleToggleStatus(m),
    }), [canDelete, canToggle]),
    pageCount,
  })

  // 4. Fetching Logic
  const fetchTeamDetails = React.useCallback(async () => {
    if (!activeOrg) return
    try {
      const data = await apiClient(`/api/organisations/${activeOrg.id}/teams`)
      const current = data.teams.find((t: any) => t.id === teamId)
      if (current) setTeam(current)
    } catch (e) { }
  }, [activeOrg, teamId])

  const fetchMembers = React.useCallback(async () => {
    if (!activeOrg) return
    setIsLoading(true)
    try {
      const qParams = new URLSearchParams()
      if (search) qParams.append("search", search)
      if (page) qParams.append("page", String(page))
      if (perPage) qParams.append("per_page", String(perPage))
      if (sort) qParams.append("sort", sort)
      if (filters.length > 0) qParams.append("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/organisations/${activeOrg.id}/teams/${teamId}/members?${qParams.toString()}`)
      setMembers(data.members || [])
      setPageCount(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg, teamId, search, page, perPage, sort, filters])

  async function handleRemoveMember(member: any) {
    setMemberToDelete(member)
    setIsDeleteDialogOpen(true)
  }

  async function handleToggleStatus(member: any) {
    if (!activeOrg) return
    try {
      await apiClient(`/api/organisations/${activeOrg.id}/teams/${teamId}/members/${member.userId}/toggle`, {
        method: "PATCH"
      })
      fetchMembers()
    } catch (error: any) {
      // apiClient handled toast
    }
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    if (!activeOrg) return
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).userId)
    
    if (ids.length === 0) return

    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id => 
        apiClient(`/api/organisations/${activeOrg.id}/teams/${teamId}/members/${id}/toggle`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive })
        })
      ))
      
      table.toggleAllRowsSelected(false)
      fetchMembers()
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchMembers(), fetchTeamDetails()])
    setIsRefreshing(false)
  }

  // 6. Effects & Subscriptions
  const { useEvent } = useSocket()
  useEvent("ORGANISATION_TEAM_MEMBERS_CHANGED", React.useCallback(() => {
    fetchMembers()
  }, [fetchMembers]))

  React.useEffect(() => {
    if (activeOrg) {
      fetchTeamDetails()
      fetchMembers()
    }
  }, [activeOrg, fetchTeamDetails, fetchMembers, search, page, perPage, sort, filters])

  if (isOrgPending) return null

  if (!activeOrg) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <ShieldAlert className="size-16 text-destructive/50" />
      <h1 className="text-2xl font-black uppercase tracking-tighter">No Active Workspace</h1>
      <Button onClick={() => router.push("/dashboard/organisation")} variant="outline" className="font-bold uppercase tracking-wider text-xs border-primary/20">Go to Workspaces</Button>
    </div>
  )

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Member Name", id: "user_name", variant: "text" },
  ]

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organization", href: "/dashboard/organisation" },
          { label: "Teams", href: "/dashboard/organisation/teams" },
          { label: team?.name || "Team", href: `/dashboard/organisation/teams` },
          { label: "Members" }
        ]}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {canAssign && (
          <Button
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 font-black uppercase tracking-widest text-[10px] px-8"
          >
            Assign Members
          </Button>
        )}
      </DashboardHeader>

      <PageShell>
        <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users2 className="size-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-tight text-foreground">{team?.name || "Loading..."} Team</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Manage Team Membership</p>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/organisation/teams")}
              className="h-8 gap-2 font-bold uppercase tracking-wider text-[10px] bg-background hover:bg-muted transition-all border-border/40"
            >
              <ArrowLeft className="size-3.5" />
              Back to Teams
            </Button>
          </div>
        </div>

        <DataTable
          table={table}
          isLoading={isLoading}
          isSearchActive={!!search}
          isRefreshing={isRefreshing}
        >
          <DataTableAdvancedToolbar
            table={table}
            filterFields={filterFields}
            filters={filters}
            setFilters={setFilters}
            onSearchChange={onSearchChange}
            onFilterReset={onFilterReset}
            search={search}
            className="mb-4"
          />
        </DataTable>

        <p className="text-[11px] font-medium text-muted-foreground/60 text-center mt-8 italic tracking-tight">
          Displaying {members.length} of {totalCount} team members
        </p>
      </PageShell>

      <AssignTeamMemberDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        organizationId={String(activeOrg.id)}
        teamId={teamId}
        teamName={team?.name || "Team"}
        onSuccess={handleRefresh}
        existingMemberUserIds={members.map(m => m.userId)}
      />

      <DeleteTeamMemberDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        member={memberToDelete}
        organizationId={String(activeOrg.id)}
        teamId={teamId}
        onSuccess={() => {
          toast.success(`${memberToDelete?.user?.name} removed from team`)
          fetchMembers()
        }}
      />

      <BulkDeleteTeamMemberDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        members={table.getFilteredSelectedRowModel().rows.map(row => row.original)}
        organizationId={String(activeOrg.id)}
        teamId={teamId}
        onSuccess={() => {
          table.toggleAllRowsSelected(false)
          fetchMembers()
        }}
      />

      <ActionBar table={table}>
         {((canToggle || canDelete)) && (
           <>
             {table.getFilteredSelectedRowModel().rows.length === 1 ? (
                table.getFilteredSelectedRowModel().rows[0].original.isActive ? (
                  canToggle && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      onClick={() => onBulkStatusUpdate(false)}
                      className="h-8 px-4 hover:bg-muted/10 text-muted-foreground rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Mark Inactive</span>
                    </Button>
                  )
                ) : (
                  canToggle && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      onClick={() => onBulkStatusUpdate(true)}
                      className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Mark Active</span>
                    </Button>
                  )
                )
             ) : (
               <>
                 {canToggle && (
                   <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      onClick={() => onBulkStatusUpdate(true)}
                      className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Mark Active</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      onClick={() => onBulkStatusUpdate(false)}
                      className="h-8 px-4 hover:bg-muted/10 text-muted-foreground rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Mark Inactive</span>
                    </Button>
                   </>
                 )}
               </>
             )}
             {canDelete && (
               <Button 
                 variant="ghost" 
                 size="sm" 
                 disabled={isBulkLoading}
                 onClick={() => setIsBulkDeleteDialogOpen(true)}
                 className="h-8 px-4 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/20 active:scale-[0.98]"
               >
                 <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
               </Button>
             )}
           </>
         )}
      </ActionBar>
    </>
  )
}
