"use client"

import * as React from "react"
import {
  PlusIcon,
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
import { useHasPermission } from "@/hooks/use-has-permission"

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
    const toastId = toast.loading(`Updating status for ${permission.name}...`);

    try {
      const res = await fetch(`/api/permissions/${permission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`${permission.name} status updated to ${newStatus ? 'Active' : 'Archived'}`, { id: toastId });
      // Functional update to avoid stale closure or circular dependency
      setPermissions(prev => prev.map(p => p.id === permission.id ? { ...p, isActive: newStatus } : p));
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  }, [])

  const handleDelete = React.useCallback(async (permission: any) => {
    if (!confirm(`Are you sure you want to delete [${permission.name}] permanently? This may break existing role assignments.`)) return;
    
    try {
      const res = await fetch(`/api/permissions/${permission.id}`, { method: "DELETE" })
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to delete permission")
      }
      toast.success("Permission deleted permanently")
      setPermissions(prev => prev.filter(p => p.id !== permission.id));
    } catch (error: any) {
      toast.error(error.message)
    }
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

      const res = await fetch(`/api/permissions?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPermissions(data.permissions)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load permissions")
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
    toast.success("Permissions list updated")
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    setIsBulkLoading(true)
    const toastId = toast.loading(`Updating status for ${ids.length} protocols...`)
    
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/permissions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      toast.success(`Successfully synchronized ${ids.length} records`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchPermissions()
    } catch (error: any) {
      toast.error("Bulk sync failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const onBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    if (!confirm(`Are you sure you want to purge ${ids.length} protocols? This action is irreversible and may impact existing role assignments.`)) return

    setIsBulkLoading(true)
    const toastId = toast.loading(`Purging ${ids.length} protocols...`)
    
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/permissions/${id}`, { method: "DELETE" })
      ))
      
      toast.success(`Successfully deleted ${ids.length} permissions`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchPermissions()
    } catch (error: any) {
      toast.error("Bulk delete failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

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
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add Permission</span>
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
           {canUpdate && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      className="h-8 gap-2 px-3 hover:bg-muted/50 text-foreground/90 rounded-full transition-all active:scale-95 border border-border/40"
                    >
                      <PowerIcon className="size-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="center" className="w-[160px] bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl p-1 shadow-2xl">
                   <DropdownMenuItem 
                     className="gap-2 focus:bg-muted/50 focus:text-foreground rounded-lg py-2 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                     onClick={() => onBulkStatusUpdate(true)}
                   >
                     <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                     Active
                   </DropdownMenuItem>
                   <DropdownMenuItem 
                     className="gap-2 focus:bg-muted/50 focus:text-foreground rounded-lg py-2 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                     onClick={() => onBulkStatusUpdate(false)}
                   >
                     <div className="size-1.5 rounded-full bg-white/20" />
                     Inactive
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           )}
           {canDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isBulkLoading}
                onClick={onBulkDelete}
                className="h-8 gap-2 px-4 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-full transition-all active:scale-95 border border-border/40"
              >
                 <Trash2Icon className="size-3.5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Purge Protocols</span>
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
    </>
  )
}
