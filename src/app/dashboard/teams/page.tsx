"use client"

import * as React from "react"
import {
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeamDialog } from "@/components/teams/team-dialog"
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog"
import { BulkDeleteTeamDialog } from "@/components/teams/bulk-delete-team-dialog"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useHasPermission } from "@/hooks/use-has-permission"
import { useWorkspace } from "@/hooks/use-workspace"
import { useRouter } from "next/navigation"

import { PageShell } from "@/components/dashboard/page-shell"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getTeamsColumns } from "@/components/teams/teams-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function TeamsPage() {
  const { data: activeOrg } = useWorkspace()
  const [teams, setTeams] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // Dialog states
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
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

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/teams/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      table.toggleAllRowsSelected(false)
      fetchTeams()
    } catch (error: any) {
      toast.error("Bulk update failed: " + error.message)
    } finally {
      setIsBulkLoading(false)
    }
  }

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
  ]

  // Action bar logic
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectionCount = selectedRows.length
  const firstSelectedTeam = selectedRows.length === 1 ? (selectedRows[0].original as any) : null
  const selectedTeamsData = selectedRows.map(row => row.original)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 shadow-sm bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-foreground">Teams</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
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
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 px-8"
            >
              <span className="text-[11px] font-black uppercase tracking-widest leading-none">Add Team</span>
            </Button>
          )}
        </div>
      </header>

      <PageShell>
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
                exportFilename="teams"
                className="mb-4"
            />
        </DataTable>

        <ActionBar table={table}>
           {selectionCount === 1 && canUpdate && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSelectedTeam(firstSelectedTeam); setIsTeamDialogOpen(true); }}
                className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
              </Button>
           )}

           {canUpdate && (
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isBulkLoading}
                onClick={() => {
                  const allActive = selectedRows.every(row => (row.original as any).isActive)
                  if (selectionCount === 1) {
                    handleToggleStatus(firstSelectedTeam)
                  } else {
                    onBulkStatusUpdate(!allActive)
                  }
                }}
                className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {selectedRows.every(row => (row.original as any).isActive) ? "Mark Inactive" : "Mark Active"}
                </span>
              </Button>
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
        </ActionBar>
        
        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
           Displaying {teams.length} of {totalCount} organizational segments
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
      <BulkDeleteTeamDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        teams={selectedTeamsData}
        onSuccess={() => {
            table.toggleAllRowsSelected(false);
            fetchTeams();
        }}
      />
    </>
  )
}
