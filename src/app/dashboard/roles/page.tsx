"use client"

import * as React from "react"
import {
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleDialog } from "@/components/roles/role-dialog"
import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"
import { BulkDeleteRoleDialog } from "@/components/roles/bulk-delete-role-dialog"
import { RolePermissionsDialog } from "@/components/roles/role-permissions-dialog"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { useHasPermission } from "@/hooks/use-has-permission"
import { apiClient } from "@/lib/api-client"

import { PageShell } from "@/components/dashboard/page-shell"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getRolesColumns } from "@/components/roles/roles-table-columns"
import { DataTableFilterField } from "@/types/data-table"

export default function RolesPage() {
  const [roles, setRoles] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<any>(null)

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("roles:create")
  const canUpdate = useHasPermission("roles:update")
  const canDelete = useHasPermission("roles:delete")
  const canToggle = useHasPermission("roles:toggle")
  const canAssignPermissions = useHasPermission("roles:assign_permission")

  const handleToggleStatus = React.useCallback(async (role: any) => {
    const newStatus = !role.isActive;
    try {
      await apiClient(`/api/roles/${role.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      setRoles((prev) => prev.map((r) => r.id === role.id ? { ...r, isActive: newStatus } : r));
    } catch (error: any) {
      // apiClient already handled toast
    }
  }, [])

  // 📋 Data Table Implementation
  const columns = React.useMemo(() => getRolesColumns({
    capabilities: { canUpdate, canDelete, canToggle, canAssignPermission: canAssignPermissions },
    onEdit: (r) => { setSelectedRole(r); setIsRoleDialogOpen(true); },
    onDelete: (r) => { setSelectedRole(r); setIsDeleteDialogOpen(true); },
    onAssignPermission: (r) => { setSelectedRole(r); setIsPermissionsDialogOpen(true); },
    onToggleStatus: handleToggleStatus,
  }), [canUpdate, canDelete, canToggle, canAssignPermissions, handleToggleStatus])

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
    data: roles,
    columns,
    pageCount,
  })

  const fetchRoles = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/roles?${params.toString()}`)
      setRoles(data.roles)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load roles", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("ROLES_CHANGED", React.useCallback(() => {
    fetchRoles()
  }, [fetchRoles]))

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchRoles()
    setIsRefreshing(false)
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows
      .filter(row => (row.original as any).slug !== 'super-admin')
      .map(row => (row.original as any).id)
    
    if (ids.length === 0) {
      toast.error("No valid entries selected. System roles are protected.", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true
      })
      return
    }

    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id => 
        apiClient(`/api/roles/${id}/toggle`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      table.toggleAllRowsSelected(false)
      fetchRoles()
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsBulkLoading(false)
    }
  }

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

  // Logic for action bar selection
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectionCount = selectedRows.length
  const firstSelectedRole = selectedRows.length === 1 ? selectedRows[0].original as any : null
  const selectedRolesData = selectedRows.map(row => row.original)
  const hasProtectedRole = selectedRows.some(row => (row.original as any).slug === 'super-admin')

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles" }
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
            onClick={() => { setSelectedRole(null); setIsRoleDialogOpen(true); }}
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 px-8"
          >
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">Add Role</span>
          </Button>
        )}
      </DashboardHeader>

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
                exportFilename="roles"
                className="mb-4"
            />
        </DataTable>

        <ActionBar table={table}>
           {!hasProtectedRole && (
             <>
               {selectionCount === 1 && canUpdate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedRole(firstSelectedRole); setIsRoleDialogOpen(true); }}
                    className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                  </Button>
               )}

               {canToggle && (
                  selectionCount === 1 ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      onClick={() => onBulkStatusUpdate(!firstSelectedRole?.isActive)}
                      className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {firstSelectedRole?.isActive ? "Mark Inactive" : "Mark Active"}
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
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                    className="h-8 px-4 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/20 active:scale-[0.98]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                  </Button>
               )}
             </>
           )}
        </ActionBar>

        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
           Displaying {roles.length} of {totalCount} roles
        </p>
      </PageShell>

      <RoleDialog
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        role={selectedRole}
        parents={roles}
        onSuccess={fetchRoles}
      />

      <DeleteRoleDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        role={selectedRole}
        onSuccess={fetchRoles}
      />

      <BulkDeleteRoleDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        roles={selectedRolesData}
        onSuccess={() => {
            table.toggleAllRowsSelected(false);
            fetchRoles();
        }}
      />

      <RolePermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        role={selectedRole}
      />
    </>
  )
}
