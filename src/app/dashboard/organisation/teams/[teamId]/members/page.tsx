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
import { authClient } from "@/lib/auth-client"
import { useHasPermission } from "@/hooks/use-has-permission"
import { apiClient } from "@/lib/api-client"

import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { OrgTabs } from "@/components/organization/org-tabs"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationTeamMemberColumns } from "@/components/organization/team-members-table-columns"
import { AssignTeamMemberDialog } from "@/components/organization/assign-team-member-dialog"
import { DataTableFilterField } from "@/types/data-table"

export default function TeamMembersPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = Number(params.teamId)
  
  const { data: activeOrg, isPending: isOrgPending } = authClient.useActiveOrganization()
  const canManage = useHasPermission("organisation:team:manage")
  
  const [members, setMembers] = React.useState<any[]>([])
  const [team, setTeam] = React.useState<any>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false)

  // 4. Fetching Logic
  const fetchTeamDetails = React.useCallback(async () => {
    if (!activeOrg) return
    try {
        const data = await apiClient(`/api/organisations/${activeOrg.id}/teams`)
        const current = data.teams.find((t: any) => t.id === teamId)
        if (current) setTeam(current)
    } catch (e) {}
  }, [activeOrg, teamId])

  const fetchMembers = React.useCallback(async () => {
    if (!activeOrg) return
    setIsLoading(true)
    try {
      const qParams = new URLSearchParams()
      // We could add page/limit here if DataTable hook parameters are used
      
      const data = await apiClient(`/api/organisations/${activeOrg.id}/teams/${teamId}/members?${qParams.toString()}`)
      setMembers(data.members || [])
      setPageCount(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg, teamId])

  // 3. Data Table Hook
  const { 
    table, 
    onSearchChange, 
    onFilterReset,
    search, 
    filters, 
    setFilters,
  } = useDataTable({
    data: members,
    columns: React.useMemo(() => getOrganisationTeamMemberColumns({
      canManage,
      onRemove: (m) => handleRemoveMember(m),
      onToggleStatus: (m) => handleToggleStatus(m),
    }), [canManage]),
    pageCount,
  })

  async function handleRemoveMember(member: any) {
    if (!activeOrg) return
    const toastId = toast.loading(`Removing ${member.user.name} from team...`)
    try {
      await apiClient(`/api/organisations/${activeOrg.id}/teams/${teamId}/members/${member.userId}`, {
        method: "DELETE"
      })
      toast.success(`${member.user.name} removed successfully`, { id: toastId })
      fetchMembers()
    } catch (error: any) {
      // apiClient handled toast
    }
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
  }, [activeOrg, fetchTeamDetails, fetchMembers])

  if (isOrgPending) return <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-primary animate-pulse">Loading...</div>
  
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
        {canManage && (
            <Button
              size="sm"
              onClick={() => setIsAssignDialogOpen(true)}
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 font-black uppercase tracking-widest text-[10px] px-6"
            >
              <UserPlus2 className="h-4 w-4" />
              Assign Members
            </Button>
        )}
      </DashboardHeader>

      <PageShell>
        <div className="flex items-center gap-3 mb-8 bg-muted/20 p-4 rounded-2xl border border-border/50">
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
        organizationId={Number(activeOrg.id)}
        teamId={teamId}
        teamName={team?.name || "Team"}
        onSuccess={handleRefresh}
        existingMemberUserIds={members.map(m => m.userId)}
      />
    </>
  )
}
