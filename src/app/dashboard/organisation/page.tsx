"use client"

import * as React from "react"
import { Building2, Plus, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSocket } from "@/providers/socket-provider"
import { authClient } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { OrganisationDialog } from "@/components/organization/organisation-dialog"
import { DeleteOrganisationDialog } from "@/components/organization/delete-organisation-dialog"
import { BulkDeleteOrganisationDialog } from "@/components/organization/bulk-delete-organisation-dialog"
import { Button } from "@/components/ui/button"
import { useHasPermission } from "@/hooks/use-has-permission"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationColumns } from "@/components/organization/organisation-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function OrganisationsPage() {
  const router = useRouter()
  const { data: activeOrg } = authClient.useActiveOrganization()

  // 1. State Hooks
  const [organisations, setOrganisations] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog States
  const [isOrgDialogOpen, setIsOrgDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [selectedOrg, setSelectedOrg] = React.useState<any>(null)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("organisation:create")
  const canUpdate = useHasPermission("organisation:update")
  const canDelete = useHasPermission("organisation:delete")
  const canToggle = useHasPermission("organisation:toggle")
  const canViewMembers = useHasPermission("organisation_member:read")
  const canViewTeams = useHasPermission("organisation_team:read")

  // 2. Data Table Hook
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
    data: organisations,
    columns: React.useMemo(() => getOrganisationColumns({
      capabilities: { canUpdate, canDelete, canToggle, canViewMembers, canViewTeams },
      onEdit: (org) => { setSelectedOrg(org); setIsOrgDialogOpen(true); },
      onDelete: (org) => { setSelectedOrg(org); setIsDeleteDialogOpen(true); },
      onToggleStatus: (org) => handleToggleStatus(org),
      onViewWorkspace: (org) => handleViewWorkspace(org),
    }), [canUpdate, canDelete, canToggle, canViewMembers, canViewTeams]),
    pageCount,
  })

  // 3. Fetching Logic
  const fetchOrganisations = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/organisations?${params.toString()}`)
      setOrganisations(data.organisations || [])
      setPageCount(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  // 4. Action Handlers
  const handleToggleStatus = async (org: any) => {
    const toastId = toast.loading(`${org.isActive ? "Deactivating" : "Activating"} ${org.name}...`)
    try {
      await apiClient(`/api/organisations/${org.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !org.isActive })
      })
      toast.success(`${org.name} status updated`, { id: toastId })
      fetchOrganisations()
    } catch (error: any) {
      // apiClient handled toast
    }
  }

  const handleViewWorkspace = async (org: any) => {
    const toastId = toast.loading(`Switching to ${org.name}...`)
    try {
      await authClient.organization.setActive({ organizationId: String(org.id) })
      toast.success(`Switched to ${org.name}`, { id: toastId })
      
      if (canViewMembers) {
        router.push("/dashboard/organisation/members")
      } else if (canViewTeams) {
        router.push("/dashboard/organisation/teams")
      } else {
        toast.error("Insufficient permissions to access dashboard sections", { id: toastId })
      }
    } catch (error: any) {
      toast.error("Failed to switch workspace", { id: toastId })
    }
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows
      .filter(row => String((row.original as any).id) !== String(activeOrg?.id))
      .map(row => (row.original as any).id)

    if (ids.length === 0) {
      toast.error("Process aborted. The active organization is protected.", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true
      })
      return
    }

    setIsBulkLoading(true)
    const toastId = toast.loading(`${isActive ? "Activating" : "Deactivating"} selected organizations...`)
    try {
      await Promise.all(ids.map(id =>
        apiClient(`/api/organisations/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ isActive })
        })
      ))

      toast.success(`Bulk status update complete`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchOrganisations()
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchOrganisations()
    setIsRefreshing(false)
  }

  // 5. Real-time WebSocket sync
  const { useEvent } = useSocket()
  
  const handleWebSocketUpdate = React.useCallback(() => {
    fetchOrganisations()
  }, [fetchOrganisations])

  useEvent("ORGANISATIONS_CHANGED", handleWebSocketUpdate)
  useEvent("ORGANISATION_MEMBERS_CHANGED", handleWebSocketUpdate)

  React.useEffect(() => {
    fetchOrganisations()
  }, [fetchOrganisations])

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
    { label: "Slug", id: "slug", variant: "text" },
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
      <div className="w-full h-full">
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

        <ActionBar table={table}>
          {(() => {
            const selectedRows = table.getFilteredSelectedRowModel().rows
            const count = selectedRows.length
            const firstOrg = count === 1 ? selectedRows[0].original as any : null
            const hasActiveOrg = selectedRows.some(row => String((row.original as any).id) === String(activeOrg?.id))

            return (
              <>
                {count === 1 && canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedOrg(firstOrg); setIsOrgDialogOpen(true); }}
                    className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                  </Button>
                )}

                {canToggle && (
                  count === 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBulkLoading || hasActiveOrg}
                      onClick={() => handleToggleStatus(firstOrg)}
                      className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {firstOrg?.isActive ? "Mark Inactive" : "Mark Active"}
                      </span>
                    </Button>
                  ) : (
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
                  )
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBulkLoading}
                    onClick={() => {
                      if (count === 1) {
                        setSelectedOrg(firstOrg)
                        setIsDeleteDialogOpen(true)
                      } else {
                        setIsBulkDeleteDialogOpen(true)
                      }
                    }}
                    className="h-8 px-4 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/20 active:scale-[0.98]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                  </Button>
                )}
              </>
            )
          })()}
        </ActionBar>

        <p className="text-[11px] font-medium text-muted-foreground/60 text-center mt-8 italic tracking-tight">
          Displaying {organisations.length} of {totalCount} organisations
        </p>
      </div>

      <OrganisationDialog
        open={isOrgDialogOpen}
        onOpenChange={setIsOrgDialogOpen}
        organisation={selectedOrg}
        onSuccess={fetchOrganisations}
      />

      <DeleteOrganisationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        organisation={selectedOrg}
        onSuccess={fetchOrganisations}
      />

      <BulkDeleteOrganisationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        organisations={table.getFilteredSelectedRowModel().rows.map(r => r.original)}
        onSuccess={() => {
          table.toggleAllRowsSelected(false);
          fetchOrganisations();
        }}
      />
    </>
  )
}
