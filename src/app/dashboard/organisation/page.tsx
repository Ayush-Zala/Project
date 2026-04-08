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
import { Button } from "@/components/ui/button"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
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
  const [selectedOrg, setSelectedOrg] = React.useState<any>(null)

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
      onEdit: (org) => { setSelectedOrg(org); setIsOrgDialogOpen(true); },
      onDelete: (org) => { setSelectedOrg(org); setIsDeleteDialogOpen(true); },
      onToggleStatus: (org) => handleToggleStatus(org),
      onViewWorkspace: (org) => handleViewWorkspace(org),
    }), []),
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
      router.push("/dashboard/organisation/members")
    } catch (error: any) {
      toast.error("Failed to switch workspace", { id: toastId })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchOrganisations()
    setIsRefreshing(false)
  }

  // 5. Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("ORGANISATIONS_CHANGED", React.useCallback(() => {
    fetchOrganisations()
  }, [fetchOrganisations]))

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
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organisations" }
        ]}
      >
        <div className="flex items-center gap-2 mr-2">
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
        <Button
          onClick={() => { setSelectedOrg(null); setIsOrgDialogOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-lg shadow-primary/20 h-8 px-8"
        >
          Add Organization
        </Button>
      </DashboardHeader>

      <PageShell>
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
           Displaying {organisations.length} of {totalCount} nodes
        </p>
      </PageShell>

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
    </>
  )
}
