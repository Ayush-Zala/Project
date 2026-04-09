"use client"

import * as React from "react"
import {
  RefreshCwIcon,
  Trash2Icon,
  PowerIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { PermissionDialog } from "@/components/permissions/permission-dialog"
import { DeletePermissionDialog } from "@/components/permissions/delete-permission-dialog"
import { BulkDeletePermissionDialog } from "@/components/permissions/bulk-delete-permission-dialog"
import { useHasPermission } from "@/hooks/use-has-permission"
import { apiClient } from "@/lib/api-client"

import { PageShell } from "@/components/dashboard/page-shell"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getPermissionsColumns } from "@/components/permissions/permissions-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function PermissionsPage() {
  const [permissions, setPermissions] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // Dialog states
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [selectedPermission, setSelectedPermission] = React.useState<any>(null)

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("permissions:create")
  const canUpdate = useHasPermission("permissions:update")
  const canDelete = useHasPermission("permissions:delete")

  // Function declared with 'function' to allow hoisting for use in handlers
  async function performFetch() {
    // This will be called by hooks later
  }

  const handleToggleStatus = React.useCallback(async (permission: any) => {
    const newStatus = !permission.isActive;

    try {
      await apiClient(`/api/permissions/${permission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      // Functional update to avoid stale closure or circular dependency
      setPermissions(prev => prev.map(p => p.id === permission.id ? { ...p, isActive: newStatus } : p));
    } catch (error: any) {
      // apiClient handles toasts
    }
  }, [])

  const handleDelete = React.useCallback((permission: any) => {
    setSelectedPermission(permission);
    setIsDeleteDialogOpen(true);
  }, [])

  const onBulkDelete = React.useCallback(() => {
    setIsBulkDeleteDialogOpen(true);
  }, [])

  // 📋 Data Table Implementation
  const columns = React.useMemo(() => getPermissionsColumns({
    capabilities: { canUpdate, canDelete, canToggle: true },
    onEdit: (p) => { setSelectedPermission(p); setIsPermissionDialogOpen(true); },
    onDelete: handleDelete,
    onToggleStatus: handleToggleStatus,
  }), [canUpdate, canDelete, handleDelete, handleToggleStatus])

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
    data: permissions,
    columns,
    pageCount,
  })

  const fetchPermissions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/permissions?${params.toString()}`)
      setPermissions(data.permissions)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load permissions", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  // Real-time synchronization
  const { useEvent } = useSocket()
  useEvent("PERMISSIONS_CHANGED", React.useCallback(() => {
    fetchPermissions()
  }, [fetchPermissions]))

  React.useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPermissions()
    setIsRefreshing(false)
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)

    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id =>
        apiClient(`/api/permissions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))

      table.toggleAllRowsSelected(false)
      fetchPermissions()
    } catch (error: any) {
      // apiClient handles toasts
    } finally {
      setIsBulkLoading(false)
    }
  }

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectionCount = selectedRows.length
  const firstSelectedPermission = selectionCount === 1 ? selectedRows[0].original as any : null
  const selectedRowsData = selectedRows.map(row => row.original)

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
    { label: "Resource", id: "resource", variant: "text" },
    { label: "Action", id: "action", variant: "text" },
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
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 shadow-sm backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Permissions</BreadcrumbPage>
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
              onClick={() => { setSelectedPermission(null); setIsPermissionDialogOpen(true); }}
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 px-8"
            >
              <span className="text-[11px] font-black uppercase tracking-widest leading-none">Add Permission</span>
            </Button>
          )}
        </div>
      </header>

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
           {selectionCount === 1 && canUpdate && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => { setSelectedPermission(firstSelectedPermission); setIsPermissionDialogOpen(true); }}
               className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/40 active:scale-95"
             >
               <span className="text-[10px] font-black uppercase tracking-widest leading-none">Edit</span>
             </Button>
           )}
           {canUpdate && (
             selectionCount === 1 ? (
               <Button 
                 variant="ghost" 
                 size="sm" 
                 disabled={isBulkLoading}
                 onClick={() => onBulkStatusUpdate(!firstSelectedPermission?.isActive)}
                 className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/40 active:scale-95"
               >
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                   {firstSelectedPermission?.isActive ? "Mark Inactive" : "Mark Active"}
                 </span>
               </Button>
             ) : (
               <>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   disabled={isBulkLoading}
                   onClick={() => onBulkStatusUpdate(true)}
                   className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/40 active:scale-95"
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest leading-none">Mark Active</span>
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   disabled={isBulkLoading}
                   onClick={() => onBulkStatusUpdate(false)}
                   className="h-8 px-4 hover:bg-muted/10 text-muted-foreground rounded-full transition-all border border-border/40 active:scale-95"
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest leading-none">Mark Inactive</span>
                 </Button>
               </>
             )
           )}
           {canDelete && (
             <Button 
               variant="ghost" 
               size="sm" 
               disabled={isBulkLoading}
               onClick={onBulkDelete}
               className="h-8 px-6 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/40 active:scale-95"
             >
               <span className="text-[10px] font-black uppercase tracking-widest leading-none">Delete</span>
             </Button>
           )}
        </ActionBar>

        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
          Displaying {permissions.length} of {totalCount} organizational protocols
        </p>
      </PageShell>

      <PermissionDialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
        permission={selectedPermission}
        onSuccess={fetchPermissions}
      />

      <DeletePermissionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        permission={selectedPermission}
        onSuccess={fetchPermissions}
      />

      <BulkDeletePermissionDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        permissions={selectedRowsData as any[]}
        onSuccess={() => {
          table.toggleAllRowsSelected(false)
          fetchPermissions()
        }}
      />
    </>
  )
}
