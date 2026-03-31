"use client"

import * as React from "react"
import {
  UserPlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  KeyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  MoreVerticalIcon,
  UserIcon,
  ShieldIcon,
  MailIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { UserDialog } from "@/components/users/user-dialog"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { ChangePasswordDialog } from "@/components/users/change-password-dialog"
import { AssignRoleDialog } from "@/components/users/assign-role-dialog"
import { UserPermissionsDialog } from "@/components/users/user-permissions-dialog"
import { Switch } from "@/components/ui/switch"
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

export default function UsersPage() {
  const [users, setUsers] = React.useState<any[]>([])
  const [pagination, setPagination] = React.useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog states
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<any>(null)
  const [availableRoles, setAvailableRoles] = React.useState<any[]>([])

  const fetchUsers = React.useCallback(async (page: number = pagination.page, searchTerm: string = search) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/users?page=${page}&limit=${pagination.limit}&search=${searchTerm}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error: any) {
      toast.error(error.message || "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.limit, search])

  const fetchRoles = React.useCallback(async () => {
    try {
      const res = await fetch("/api/roles?limit=100") // Get all roles for selection
      const data = await res.json()
      setAvailableRoles(data.roles || [])
    } catch (error) {
      console.error("Failed to load roles for selection", error)
    }
  }, [])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("USERS_CHANGED", React.useCallback(() => {
    fetchUsers(pagination.page, search)
  }, [fetchUsers, pagination.page, search]))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, fetchUsers])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchUsers(1)
    setIsRefreshing(false)
    toast.success("Users list refreshed")
  }

  const handleToggleStatus = async (user: any) => {
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
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>User Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-muted/20 p-8 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Accounts</h1>
            </div>
            <p className="text-muted-foreground ml-11">Provision and manage administrative and employee accounts.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email..."
                className="pl-10 w-full md:w-[280px] bg-background/50 border-border/40 focus:border-primary/50 transition-all rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-border/40 hover:bg-muted/50 rounded-xl h-10 w-10 text-muted-foreground hover:text-primary transition-all active:scale-95"
              title="Sync Manifest"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <UserPlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCwIcon className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm font-medium tracking-widest uppercase">Syncing Users</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">S.No</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">User Profile</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Identity & Role</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic border-none">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <TableRow key={user.id} className="border-border/40 hover:bg-muted/20 transition-colors group">
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      #{((pagination?.page || 1) - 1) * (pagination?.limit || 10) + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shrink-0">
                          {user.image ? (
                            <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{user.name}</span>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MailIcon className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge
                          variant="outline"
                          className="rounded-lg px-2 py-0.5 border-primary/20 bg-primary/5 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit"
                          style={{ borderColor: `${user.role.colorCode}40`, color: user.role.colorCode, backgroundColor: `${user.role.colorCode}10` }}
                        >
                          <ShieldIcon className="h-3 w-3" />
                          {user.role.name}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No role assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Switch
                          checked={user.isActive}
                          disabled={user.role?.slug === 'super-admin'}
                          onCheckedChange={() => handleToggleStatus(user)}
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${user.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-muted group-hover:bg-muted transition-colors">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-[180px] bg-popover border-border/40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5">
                              Account Control
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/40" />
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                              onClick={() => { setSelectedUser(user); setIsUserDialogOpen(true); }}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              <span>Edit Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                              onClick={() => { setSelectedUser(user); setIsRoleDialogOpen(true); }}
                            >
                              <ShieldIcon className="h-3.5 w-3.5" />
                              <span>Change Role</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                              onClick={() => { setSelectedUser(user); setIsPasswordDialogOpen(true); }}
                            >
                              <KeyIcon className="h-3.5 w-3.5" />
                              <span>Reset Password</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                              onClick={() => { setSelectedUser(user); setIsPermissionsDialogOpen(true); }}
                            >
                              <ShieldIcon className="h-3.5 w-3.5 text-primary" />
                              <span>Direct Permissions</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-border/40" />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer transition-colors py-2"
                              onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                              <span>Remove Access</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 bg-muted/10 border-t border-border/40">
            <p className="text-xs text-muted-foreground italic">
              Showing <span className="font-bold text-foreground">{users.length}</span> of <span className="font-bold text-foreground">{pagination.total}</span> accounts
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-border/40"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchUsers(pagination.page - 1)}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {pagination.page}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-border/40"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        user={selectedUser}
        roles={availableRoles}
        onSuccess={() => fetchUsers(pagination.page)}
      />
      <DeleteUserDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers(pagination.page)}
      />
      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers(pagination.page)}
      />
      <AssignRoleDialog
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        user={selectedUser}
        roles={availableRoles}
        onSuccess={() => fetchUsers(pagination.page)}
      />
      <UserPermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        user={selectedUser}
      />
    </>
  )
}
