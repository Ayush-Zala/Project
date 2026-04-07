"use client"

import * as React from "react"
import {
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeamDialog } from "@/components/teams/team-dialog"
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { useHasPermission } from "@/hooks/use-has-permission"
import { useRouter } from "next/navigation"

import { PageShell } from "@/components/dashboard/page-shell"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getTeamsColumns } from "@/components/teams/teams-table-columns"
import { DataTableFilterField } from "@/types/data-table"
import { Trash2Icon } from "lucide-react"

export default function TeamsPage() {
  const [teams, setTeams] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // Dialog states
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<any>(null)

  const router = useRouter()

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("teams:create")
  const canUpdate = useHasPermission("teams:update")
  const canDelete = useHasPermission("teams:delete")

  const handleToggleStatus = async (team: any) => {
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !team.isActive }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(`Team ${team.name} ${!team.isActive ? 'activated' : 'suspended'}`)
      fetchTeams()
    } catch (error: any) {
      toast.error(error.message || "Failed to update team status")
    }
  }

  // 📋 Data Table Implementation
  const columns = React.useMemo(() => getTeamsColumns({
    capabilities: { canUpdate, canDelete, canToggle: canUpdate },
    onEdit: (t) => { setSelectedTeam(t); setIsTeamDialogOpen(true); },
    onDelete: (t) => { setSelectedTeam(t); setIsDeleteDialogOpen(true); },
    onToggleStatus: handleToggleStatus,
    onManageMembers: (t) => router.push(`/dashboard/teams/${t.id}`),
  }), [canUpdate, canDelete, router, handleToggleStatus])

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
    columns,
    pageCount,
  })

  const fetchTeams = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const res = await fetch(`/api/teams?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTeams(data.teams)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load teams")
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("TEAMS_CHANGED", React.useCallback(() => {
    fetchTeams()
  }, [fetchTeams]))

  React.useEffect(() => {
    fetchTeams()
  }, [fetchTeams])
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTeams()
    setIsRefreshing(false)
    toast.success("Teams manifest synchronized")
  }

  const onBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    if (!confirm(`Are you sure you want to purge ${ids.length} teams? This action is irreversible.`)) return

    setIsBulkLoading(true)
    const toastId = toast.loading(`Purging ${ids.length} teams...`)
    
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/teams/${id}`, { method: "DELETE" })
      ))
      
      toast.success(`Successfully purged ${ids.length} teams`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchTeams()
    } catch (error: any) {
      toast.error("Bulk purge failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
  ]

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Teams" }
        ]}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95"
          title="Refresh"
        >
          <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        {canCreate && (
          <Button
            onClick={() => { setSelectedTeam(null); setIsTeamDialogOpen(true); }}
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Add Team</span>
          </Button>
        )}
      </DashboardHeader>

      <PageShell>
        {/* Advanced Data Table */}
        <DataTable
            table={table}
            className="relative"
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

        <ActionBar table={table}>
           {canDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isBulkLoading}
                onClick={onBulkDelete}
                className="h-8 gap-2 px-4 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-full transition-all active:scale-95 border border-border/20"
              >
                 <Trash2Icon className="size-3.5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Delete Teams</span>
              </Button>
           )}
        </ActionBar>
        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
           Displaying {teams.length} of {totalCount} teams
        </p>
      </PageShell>

      <TeamDialog
        open={isTeamDialogOpen}
        onOpenChange={setIsTeamDialogOpen}
        team={selectedTeam}
        onSuccess={fetchTeams}
      />

      <DeleteTeamDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        team={selectedTeam}
        onSuccess={fetchTeams}
      />
    </>
  )
}
