"use client"

import * as React from "react"
import {
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserDialog } from "@/components/users/user-dialog"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { ChangePasswordDialog } from "@/components/users/change-password-dialog"
import { AssignRoleDialog } from "@/components/users/assign-role-dialog"
import { UserPermissionsDialog } from "@/components/users/user-permissions-dialog"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { PageShell } from "@/components/dashboard/page-shell"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { ActionBar } from "@/components/data-table/action-bar"
import { useDataTable } from "@/hooks/use-data-table"
import { getUsersColumns } from "@/components/users/users-table-columns"
import { useSearchParams } from "next/navigation"
import { DataTableFilterField } from "@/types/data-table"
import { Trash2Icon, UserCheckIcon, UserMinusIcon } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // Dialog states
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<any>(null)
  const [availableRoles, setAvailableRoles] = React.useState<any[]>([])

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("users:create")
  const canUpdate = useHasPermission("users:update")
  const canDelete = useHasPermission("users:delete")
  const canToggle = useHasPermission("users:toggle")
  const canAssignRole = useHasPermission("users:assign_role")
  const canAssignPermission = useHasPermission("users:assign_permission")

  const handleToggleStatus = React.useCallback(async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to toggle status")
      }

      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: updated.isActive } : u))
      toast.success(`${user.name} is now ${updated.isActive ? 'active' : 'inactive'}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }, [])

  // 📋 Data Table Implementation
  const columns = React.useMemo(() => getUsersColumns({
    capabilities: { canUpdate, canDelete, canToggle, canAssignRole, canAssignPermission },
    onEdit: (u) => { setSelectedUser(u); setIsUserDialogOpen(true); },
    onDelete: (u) => { setSelectedUser(u); setIsDeleteDialogOpen(true); },
    onPasswordReset: (u) => { setSelectedUser(u); setIsPasswordDialogOpen(true); },
    onRoleChange: (u) => { setSelectedUser(u); setIsRoleDialogOpen(true); },
    onDirectPermissions: (u) => { setSelectedUser(u); setIsPermissionsDialogOpen(true); },
    onToggleStatus: handleToggleStatus,
  }), [canUpdate, canDelete, canToggle, canAssignRole, canAssignPermission, handleToggleStatus])

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
    data: users,
    columns,
    pageCount,
    initialColumnVisibility: {
      email: false,
    },
  })

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const res = await fetch(`/api/users?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.users)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  const fetchRoles = React.useCallback(async () => {
    try {
      const res = await fetch("/api/roles?limit=100")
      const data = await res.json()
      setAvailableRoles(data.roles || [])
    } catch (error) {
      console.error("Failed to load roles for selection", error)
    }
  }, [])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("USERS_CHANGED", React.useCallback(() => {
    fetchUsers()
  }, [fetchUsers]))

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchUsers()
    setIsRefreshing(false)
    toast.success("Users list refreshed")
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    setIsBulkLoading(true)
    const toastId = toast.loading(`Updating status for ${ids.length} entries...`)
    
    try {
      // Execute parallel updates via the main PATCH endpoint
      await Promise.all(ids.map(id => 
        fetch(`/api/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      toast.success(`Succesfully synchronized ${ids.length} records`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchUsers()
    } catch (error: any) {
      toast.error("Bulk sync failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const onBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    if (!confirm(`Are you sure you want to purge ${ids.length} entries? This action is irreversible.`)) return

    setIsBulkLoading(true)
    const toastId = toast.loading(`Purging ${ids.length} entries...`)
    
    try {
      await Promise.all(ids.map(id => 
        fetch(`/api/users/${id}`, { method: "DELETE" })
      ))
      
      toast.success(`Successfully deleted ${ids.length} records`, { id: toastId })
      table.toggleAllRowsSelected(false)
      fetchUsers()
    } catch (error: any) {
      toast.error("Bulk delete failed: " + error.message, { id: toastId })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "name", variant: "text" },
    { label: "Email", id: "email", variant: "text" },
    { 
      label: "Role", 
      id: "roleId", 
      variant: "select", 
      options: availableRoles.map(r => ({ label: r.name, value: String(r.id) })) 
    },
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
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4">
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
                <BreadcrumbPage>Users</BreadcrumbPage>
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
              onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add User</span>
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
           {canToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isBulkLoading}
                      className="h-8 gap-2 px-3 hover:bg-muted/50 text-foreground/90 rounded-full transition-all active:scale-95 border border-border/40"
                    >
                      <UserCheckIcon className="size-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Activate</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="center" className="w-[160px] bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl p-1 shadow-2xl">
                   <DropdownMenuItem 
                     className="gap-2 focus:bg-muted/50 focus:text-foreground rounded-lg py-2 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                     onClick={() => onBulkStatusUpdate(true)}
                   >
                     <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                     Operational
                   </DropdownMenuItem>
                   <DropdownMenuItem 
                     className="gap-2 focus:bg-muted/50 focus:text-foreground rounded-lg py-2 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                     onClick={() => onBulkStatusUpdate(false)}
                   >
                     <div className="size-1.5 rounded-full bg-muted-foreground" />
                     Suspended
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
                className="h-8 gap-2 px-3 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-full transition-all active:scale-95 border border-border/40"
              >
                 <Trash2Icon className="size-3.5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Purge</span>
              </Button>
           )}
        </ActionBar>
        
        <p className="text-[11px] font-medium text-muted-foreground italic text-center mt-2">
           Displaying {users.length} of {totalCount} organizational entities
        </p>
      </PageShell>

      {/* Dialogs */}
      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        user={selectedUser}
        roles={availableRoles}
        onSuccess={() => fetchUsers()}
      />
      <DeleteUserDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />
      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />
      <AssignRoleDialog
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        user={selectedUser}
        roles={availableRoles}
        onSuccess={() => fetchUsers()}
      />
      <UserPermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        user={selectedUser}
      />
    </>
  )
}
