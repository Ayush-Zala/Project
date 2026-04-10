"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  PlusIcon,
  RefreshCwIcon,
  Layers,
  ShieldAlert,
  Building2,
  FolderPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { Separator } from "@/components/ui/separator"
import { useHasPermission } from "@/hooks/use-has-permission"
import { authClient } from "@/lib/auth-client"
import { TeamDialog } from "@/components/organization/team-dialog"
import { DeleteTeamDialog } from "@/components/organization/delete-team-dialog"
import { OrgTabs } from "@/components/organization/org-tabs"
import { BulkDeleteTeamDialog } from "@/components/organization/bulk-delete-team-dialog"
import { ActionBar } from "@/components/data-table/action-bar"

import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationTeamColumns } from "@/components/organization/teams-table-columns"
import { DataTableFilterField } from "@/types/data-table"
import { apiClient } from "@/lib/api-client"
import { useWorkspace } from "@/hooks/use-workspace"

export default function OrganisationTeamsPage() {
  const router = useRouter()
  // 1. Auth & Context Hooks
  const { data: activeOrg, isLoading: isOrgPending, isExternal } = useWorkspace()
  const canCreate = useHasPermission("organisation_team:create")
  const canUpdate = useHasPermission("organisation_team:update")
  const canDelete = useHasPermission("organisation_team:delete")
  const canToggle = useHasPermission("organisation_team:toggle")
  const canViewTeamMembers = useHasPermission("organisation_team_member:read")
  
  // 2. State Hooks
  const [teams, setTeams] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<any>(null)
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
    sort, 
    page, 
    perPage 
  } = useDataTable({
    data: teams,
    columns: React.useMemo(() => getOrganisationTeamColumns({
      capabilities: { canUpdate, canDelete, canToggle, canViewTeamMembers },
      onEdit: (t) => { setSelectedTeam(t); setIsTeamDialogOpen(true); },
      onDelete: (t) => { setSelectedTeam(t); setIsDeleteDialogOpen(true); },
      onToggleStatus: (t) => handleToggleStatus(t),
      onViewMembers: (t) => router.push(`/dashboard/organisation/teams/${t.id}/members`),
    }), [canUpdate, canDelete, canToggle, canViewTeamMembers, router]),
    pageCount,
  })

  // 4. Fetching Logic
  const fetchTeams = React.useCallback(async () => {
    if (!activeOrg) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/organisations/${activeOrg.id}/teams?${params.toString()}`)
      setTeams(data.teams)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load teams", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg, page, perPage, sort, search, filters])

  // 5. Event Handlers
  async function handleToggleStatus(team: any) {
     if (!activeOrg) return
     try {
       await apiClient(`/api/organisations/${activeOrg.id}/teams/${team.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ isActive: !team.isActive })
       })
       fetchTeams()
     } catch (error: any) {
       // apiClient already handled toast
     }
  }

  async function handleDelete(team: any) {
    if (!activeOrg) return
    setSelectedTeam(team)
    setIsDeleteDialogOpen(true)
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    if (!activeOrg) return
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    if (ids.length === 0) return

    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id => 
        apiClient(`/api/organisations/${activeOrg.id}/teams/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      table.toggleAllRowsSelected(false)
      fetchTeams()
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTeams()
    setIsRefreshing(false)
  }

  // 6. Effects & Subscriptions
  const { useEvent } = useSocket()

  useEvent("ORGANISATION_TEAMS_CHANGED", React.useCallback(() => {
    fetchTeams()
  }, [fetchTeams]))

  useEvent("ORGANISATIONS_CHANGED", React.useCallback(() => {
    fetchTeams()
  }, [fetchTeams]))

  useEvent("ORGANISATION_TEAM_MEMBERS_CHANGED", React.useCallback(() => {
    fetchTeams()
  }, [fetchTeams]))

  React.useEffect(() => {
    if (activeOrg) fetchTeams()
  }, [activeOrg, fetchTeams])

  // 7. Global Refresh Hardware Listener
  React.useEffect(() => {
    const handleGlobalRefresh = () => fetchTeams()
    window.addEventListener("ORG_MODULE_REFRESH", handleGlobalRefresh)
    return () => window.removeEventListener("ORG_MODULE_REFRESH", handleGlobalRefresh)
  }, [fetchTeams])

  if (isOrgPending) return null
  if (!activeOrg) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
        <ShieldAlert className="size-16 text-destructive/50" />
        <h1 className="text-2xl font-black uppercase tracking-tighter">No Active Workspace</h1>
        <p className="text-muted-foreground font-medium max-w-sm text-center italic">Please select an organization from the sidebar to manage teams.</p>
        <Button onClick={() => window.location.href = "/dashboard/organisation"} variant="outline" className="font-bold uppercase tracking-wider text-xs border-primary/20 hover:bg-primary/5 transition-all">Go to Workspaces</Button>
    </div>
  )

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Team Name", id: "name", variant: "text" },
    { 
      label: "Status", 
      id: "isActive", 
      variant: "select", 
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
      ] 
    },
  ]

  return (
    <>
      <div className="w-full">
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
           Displaying {teams.length} of {totalCount} teams
        </p>

        <TeamDialog 
          open={isTeamDialogOpen}
          onOpenChange={(open: boolean) => {
            setIsTeamDialogOpen(open)
            if (!open) setSelectedTeam(null)
          }}
          organizationId={activeOrg.id.toString()}
          team={selectedTeam}
          onSuccess={fetchTeams}
        />

        <DeleteTeamDialog 
          open={isDeleteDialogOpen}
          onOpenChange={(open: boolean) => {
            setIsDeleteDialogOpen(open)
            if (!open) setSelectedTeam(null)
          }}
          organizationId={activeOrg.id.toString()}
          team={selectedTeam}
          onSuccess={fetchTeams}
        />

        <BulkDeleteTeamDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          teams={table.getFilteredSelectedRowModel().rows.map(row => row.original)}
          organizationId={activeOrg?.id?.toString() || ""}
          onSuccess={() => {
            table.toggleAllRowsSelected(false)
            fetchTeams()
          }}
        />

        <ActionBar table={table}>
          {((canUpdate || canToggle || canDelete)) && (
            <>
              {table.getFilteredSelectedRowModel().rows.length === 1 && canUpdate && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { 
                    const t = table.getFilteredSelectedRowModel().rows[0].original
                    setSelectedTeam(t); 
                    setIsTeamDialogOpen(true); 
                  }}
                  className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                </Button>
              )}

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
      </div>
    </>
  )
}
