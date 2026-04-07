"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  PlusIcon,
  RefreshCwIcon,
  PowerIcon,
  Trash2Icon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleDialog } from "@/components/roles/role-dialog"
import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"
import { RolePermissionsDialog } from "@/components/roles/role-permissions-dialog"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { useHasPermission } from "@/hooks/use-has-permission"

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
    const toastId = toast.loading(`Updating status for ${role.name}...`);

    try {
      const res = await fetch(`/api/roles/${role.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`${role.name} status updated to ${newStatus ? 'Active' : 'Archived'}`, { id: toastId });
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
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

      const res = await fetch(`/api/roles?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRoles(data.roles)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load roles")
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
    toast.success("Roles refreshed")
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows
      .filter(row => (row.original as any).slug !== 'super-admin')
      .map(row => (row.original as any).id)
    
    if (ids.length === 0) {
      toast.error("No valid entries selected. Admin roles are protected.")
      return
    }

    setIsBulkLoading(true)
    const toastId = toast.loading(`Updating status for ${ids.length} entries...`)
    
    try {
      // Execute parallel updates
      await Promise.all(ids.map(id => 
        fetch(`/api/roles/${id}/toggle`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      toast.success(`Succesfully synchronized ${ids.length} records`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchRoles()
    } catch (error: any) {
      toast.error("Bulk sync failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const onBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows
      .filter(row => (row.original as any).slug !== 'super-admin')
      .map(row => (row.original as any).id)
    
    if (ids.length === 0) {
      toast.error("No valid entries selected for purging. Apex nodes are protected.")
      return
    }

    setIsBulkLoading(true)
    const toastId = toast.loading(`Purging ${ids.length} entries...`)
    
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/roles/${id}`, { method: "DELETE" })
      ))
      
      toast.success(`Successfully purged ${ids.length} records`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchRoles()
    } catch (error: any) {
      toast.error("Bulk purge failed: " + error.message, { id: toastId })
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
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Add Role</span>
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
           {canToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      className="h-8 gap-2 px-3 hover:bg-primary/10 text-primary rounded-full transition-all active:scale-[0.98] border border-border/20"
                    >
                      <PowerIcon className="size-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Signaling</span>
                    </Button>
                  }
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <DropdownMenuContent align="center" className="w-[180px] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl p-1.5">
                     <DropdownMenuItem 
                       className="gap-2 focus:bg-primary/5 focus:text-primary rounded-lg py-2.5 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all"
                       onClick={() => onBulkStatusUpdate(true)}
                     >
                       <div className="size-1.5 rounded-full bg-primary" />
                       Operational
                     </DropdownMenuItem>
                     <DropdownMenuItem 
                       className="gap-2 focus:bg-primary/5 focus:text-primary rounded-lg py-2.5 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all"
                       onClick={() => onBulkStatusUpdate(false)}
                     >
                       <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                       Restricted
                     </DropdownMenuItem>
                  </DropdownMenuContent>
                </motion.div>
              </DropdownMenu>
           )}
           {canDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isBulkLoading}
                onClick={onBulkDelete}
                className="h-8 gap-2 px-3 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-full transition-all active:scale-[0.98] border border-border/20"
              >
                 <Trash2Icon className="size-3.5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Purge Nodes</span>
              </Button>
           )}
        </ActionBar>

        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
           Displaying {roles.length} of {totalCount} operational roles
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

      <RolePermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        role={selectedRole}
      />
    </>
  )
}
