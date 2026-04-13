"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Building, Contact, Plus, RefreshCwIcon, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { apiClient } from "@/lib/api-client"
import { useWorkspace } from "@/hooks/use-workspace"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { ClientDialog } from "@/components/company/client-dialog"
import { DeleteClientDialog } from "@/components/company/delete-client-dialog"
import { Button } from "@/components/ui/button"
import { useHasPermission } from "@/hooks/use-has-permission"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getClientColumns } from "@/components/company/client-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function CompanyClientsPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const { data: activeOrg } = useWorkspace()

  // 1. State Hooks
  const [company, setCompany] = React.useState<any>(null)
  const [clients, setClients] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<any>(null)

  // Capability Guards
  const canCreate = useHasPermission("company_client:create")
  const canUpdate = useHasPermission("company_client:update")
  const canDelete = useHasPermission("company_client:delete")
  const canToggle = useHasPermission("company_client:toggle")

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
    data: clients,
    columns: React.useMemo(() => getClientColumns({
      capabilities: { canUpdate, canDelete, canToggle },
      onEdit: (client) => {
        setSelectedClient(client);
        setIsDialogOpen(true);
      },
      onDelete: (client) => handleDelete(client),
      onToggleStatus: (client) => handleToggleStatus(client),
    }), [canUpdate, canDelete, canToggle]),
    pageCount,
  })

  // 3. Fetching Logic
  const fetchCompany = React.useCallback(async () => {
    if (!companyId) return
    try {
      const data = await apiClient(`/api/companies/${companyId}`)
      setCompany(data)
    } catch (error) {
      // handled
    }
  }, [companyId])

  const fetchClients = React.useCallback(async () => {
    if (!activeOrg?.id || !companyId) return
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.set("page", String(page))
      queryParams.set("per_page", String(perPage))
      if (sort) queryParams.set("sort", sort)
      if (search) queryParams.set("search", search)
      
      const allFilters = [...(filters || []), { id: "companyId", value: Number(companyId), operator: "equals" }]
      queryParams.set("filters", JSON.stringify(allFilters))

      const data = await apiClient(`/api/organisations/${activeOrg.id}/clients?${queryParams.toString()}`)
      setClients(data.clients || [])
      setPageCount(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (error: any) {
      // handled
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg?.id, companyId, page, perPage, sort, search, filters])

  // 4. Action Handlers
  const handleToggleStatus = async (client: any) => {
    const toastId = toast.loading(`${client.isActive ? "Deactivating" : "Activating"} ${client.fullName}...`)
    try {
      await apiClient(`/api/clients/${client.id}/status`, {
        method: "PATCH"
      })
      toast.success(`${client.fullName} status updated`, { id: toastId })
      fetchClients()
    } catch (error: any) {
      // handled
    }
  }

  const handleDelete = (client: any) => {
     setSelectedClient(client)
     setIsDeleteDialogOpen(true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchCompany(), fetchClients()])
    setIsRefreshing(false)
  }

  // 5. Real-time WebSocket sync
  const { useEvent } = useSocket()
  
  const handleWebSocketUpdate = React.useCallback(() => {
    fetchClients()
  }, [fetchClients])

  useEvent("CLIENTS_CHANGED", handleWebSocketUpdate)

  React.useEffect(() => {
    fetchCompany()
    fetchClients()
  }, [fetchCompany, fetchClients])

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "fullName", variant: "text" },
    { label: "Designation", id: "designation", variant: "text" },
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
            { label: "Companies", href: "/dashboard/companies" },
            { label: company?.name || "Company" },
            { label: "Clients" }
        ]}
      >
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0 border-border/40 hover:bg-primary/5 hidden sm:flex items-center justify-center rounded-full"
                title="Refresh"
            >
                <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {canCreate && (
                <Button 
                    size="sm" 
                    onClick={() => {
                        setSelectedClient(null);
                        setIsDialogOpen(true);
                    }}
                    className="h-8 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Client</span>
                </Button>
            )}
        </div>
      </DashboardHeader>

      <PageShell>
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
            exportFilename="company-clients"
            className="mb-4"
          />
        </DataTable>

        <ActionBar table={table}>
          {(() => {
            const selectedRows = table.getFilteredSelectedRowModel().rows
            const count = selectedRows.length
            const first = count === 1 ? selectedRows[0].original as any : null

            return (
              <>
                {count === 1 && canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setSelectedClient(first);
                        setIsDialogOpen(true);
                    }}
                    className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                  </Button>
                )}

                {canToggle && count === 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(first)}
                      className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {first?.isActive ? "Mark Inactive" : "Mark Active"}
                      </span>
                    </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (count === 1) handleDelete(first)
                      else toast.error("Bulk delete not implemented yet")
                    }}
                    className="h-8 px-4 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/20"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                  </Button>
                )}
              </>
            )
          })()}
        </ActionBar>

        <p className="text-[11px] font-medium text-muted-foreground/60 text-center mt-8 italic tracking-tight">
          Displaying {clients.length} of {totalCount} clients
        </p>
      </div>

      <ClientDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        client={selectedClient}
        defaultCompanyId={companyId}
        onSuccess={fetchClients}
      />

      <DeleteClientDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        client={selectedClient}
        onSuccess={fetchClients}
      />
    </PageShell>
  </>
  )
}
