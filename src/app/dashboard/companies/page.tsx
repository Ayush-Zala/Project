"use client"

import * as React from "react"
import { Building, Plus, RefreshCwIcon, Search } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSocket } from "@/providers/socket-provider"
import { authClient } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { CompanyDialog } from "@/components/company/company-dialog"
import { DeleteCompanyDialog } from "@/components/company/delete-company-dialog"
import { Button } from "@/components/ui/button"
import { useHasPermission } from "@/hooks/use-has-permission"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getCompanyColumns } from "@/components/company/company-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function CompaniesPage() {
  const router = useRouter()
  const { data: activeOrg } = authClient.useActiveOrganization()

  // 1. State Hooks
  const [companies, setCompanies] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedCompany, setSelectedCompany] = React.useState<any>(null)

  // Capability Guards
  const canCreate = useHasPermission("company:create")
  const canUpdate = useHasPermission("company:update")
  const canDelete = useHasPermission("company:delete")
  const canToggle = useHasPermission("company:toggle")

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
    data: companies,
    columns: React.useMemo(() => getCompanyColumns({
      capabilities: { canUpdate, canDelete, canToggle },
      onEdit: (company) => {
        setSelectedCompany(company);
        setIsDialogOpen(true);
      },
      onDelete: (company) => handleDelete(company),
      onToggleStatus: (company) => handleToggleStatus(company),
      onShowClients: (company) => {
        router.push(`/dashboard/companies/${company.id}/clients`)
      },
    }), [canUpdate, canDelete, canToggle, router]),
    pageCount,
  })

  // 3. Fetching Logic
  const fetchCompanies = React.useCallback(async () => {
    if (!activeOrg?.id) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/organisations/${activeOrg.id}/companies?${params.toString()}`)
      setCompanies(data.companies || [])
      setPageCount(data.pagination?.totalPages || 0)
      setTotalCount(data.pagination?.total || 0)
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg?.id, page, perPage, sort, search, filters])

  // 4. Action Handlers
  const handleToggleStatus = async (company: any) => {
    const toastId = toast.loading(`${company.isActive ? "Deactivating" : "Activating"} ${company.name}...`)
    try {
      await apiClient(`/api/companies/${company.id}/status`, {
        method: "PATCH"
      })
      toast.success(`${company.name} status updated`, { id: toastId })
      fetchCompanies()
    } catch (error: any) {
      // apiClient handled toast
    }
  }

  const handleDelete = (company: any) => {
     setSelectedCompany(company)
     setIsDeleteDialogOpen(true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchCompanies()
    setIsRefreshing(false)
  }

  // 5. Real-time WebSocket sync
  const { useEvent } = useSocket()
  
  const handleWebSocketUpdate = React.useCallback(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEvent("COMPANIES_CHANGED", handleWebSocketUpdate)

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
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
            { label: "Companies" }
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
                        setSelectedCompany(null);
                        setIsDialogOpen(true);
                    }}
                    className="h-8 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Company</span>
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
                        setSelectedCompany(first);
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
          Displaying {companies.length} of {totalCount} companies
        </p>
      </div>

      <CompanyDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        company={selectedCompany}
        onSuccess={fetchCompanies}
      />

      <DeleteCompanyDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        company={selectedCompany}
        onSuccess={fetchCompanies}
      />
    </PageShell>
  </>
  )
}
