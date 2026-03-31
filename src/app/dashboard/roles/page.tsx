"use client"

import * as React from "react"
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  MoreVerticalIcon,
  PowerIcon
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
import { RoleDialog } from "@/components/roles/role-dialog"
import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"
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

export default function RolesPage() {
  const [roles, setRoles] = React.useState<any[]>([])
  const [pagination, setPagination] = React.useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<any>(null)

  const fetchRoles = React.useCallback(async (page: number = pagination.page, searchTerm: string = search) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/roles?page=${page}&limit=${pagination.limit}&search=${searchTerm}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRoles(data.roles)
      setPagination(data.pagination)
    } catch (error: any) {
      toast.error(error.message || "Failed to load roles")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.limit, search])

  // 🔌 Real-time WebSocket sync — auto-reload when any user mutates roles data
  const { useEvent } = useSocket()
  useEvent("ROLES_CHANGED", React.useCallback(() => {
    fetchRoles(pagination.page, search)
  }, [fetchRoles, pagination.page, search]))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoles(1, search)
    }, 500) // Debounced search
    return () => clearTimeout(timer)
  }, [search, fetchRoles])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchRoles(1)
    setIsRefreshing(false)
    toast.success("Roles list refreshed")
  }

  const handleToggleStatus = async (role: any) => {
    try {
      const res = await fetch(`/api/roles/${role.id}/toggle`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to toggle role status")

      const updated = await res.json()
      setRoles(prev => prev.map(r => r.id === role.id ? updated : r))
      toast.success(`${role.name} is now ${updated.isActive ? 'active' : 'inactive'}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      {/* ── Sidebar header bar ─────────────────────────── */}
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
                <BreadcrumbPage>Role Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────── */}
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-muted/20 p-8 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Role Management</h1>
            </div>
            <p className="text-muted-foreground ml-11">Configure hierarchical security roles and access levels.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, slug..."
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
              onClick={() => { setSelectedRole(null); setIsRoleDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add Role</span>
            </Button>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCwIcon className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm font-medium tracking-widest uppercase">Loading Roles</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">ID</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Identity</TableHead>
                <TableHead className="hidden lg:table-cell font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Hierarchy</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Created</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-4 bg-muted/20 rounded-full mb-2">
                        <ShieldCheckIcon className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No roles found matching your criteria</p>
                      <Button variant="link" onClick={() => setSearch("")} className="text-primary hover:text-primary/80">Clear filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role, index) => (
                  <TableRow key={role.id} className="border-border/20 group hover:bg-primary/5 transition-colors">
                    <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground py-6">
                      #{(pagination.page - 1) * pagination.limit + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform group-hover:scale-110"
                          style={{ backgroundColor: role.colorCode || '#3b82f6' }}
                        >
                          {role.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{role.name}</span>
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{role.slug}</code>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {role.parent ? (
                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
                          Sub of {role.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50">Root Role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={role.isActive}
                          disabled={role.slug === 'super-admin'}
                          onCheckedChange={() => handleToggleStatus(role)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className={`text-xs font-bold ${role.isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {role.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-medium">
                      {new Date(Number(role.createdAt)).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-10 w-10 p-0 hover:bg-primary/10 rounded-full">
                              <MoreVerticalIcon className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48 bg-background border-border/40 p-2 shadow-2xl">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2 py-2">Entity Controls</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem
                              onClick={() => { setSelectedRole(role); setIsRoleDialogOpen(true); }}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary"
                            >
                              <PencilIcon className="h-4 w-4" />
                              <span className="font-medium">Modify Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(role)}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary"
                            >
                              <PowerIcon className="h-4 w-4" />
                              <span className="font-medium">{role.isActive ? 'Suspend Authorization' : 'Restore Authorization'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-border/40 my-1" />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => { setSelectedRole(role); setIsDeleteDialogOpen(true); }}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-red-500/10 text-red-500 transition-colors focus:bg-red-500/10 focus:text-red-500"
                            >
                              <Trash2Icon className="h-4 w-4" />
                              <span className="font-bold">Purge Permanently</span>
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

          {/* Improved Pagination Footer */}
          <div className="flex items-center justify-between p-6 bg-muted/10 border-t border-border/40">
            <div className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground font-bold">{roles.length}</span> of <span className="text-foreground font-bold">{pagination.total}</span> roles
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchRoles(pagination.page - 1)}
                className="h-9 w-9 p-0 border-border/40 rounded-lg hover:bg-muted/50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === pagination.page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => fetchRoles(p)}
                    className={`h-9 w-9 p-0 rounded-lg font-bold text-xs ${p === pagination.page ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10 hover:text-primary'}`}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchRoles(pagination.page + 1)}
                className="h-9 w-9 p-0 border-border/40 rounded-lg hover:bg-muted/50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog Components */}
        <RoleDialog
          open={isRoleDialogOpen}
          onOpenChange={(open) => {
            setIsRoleDialogOpen(open);
            if (!open) setSelectedRole(null);
          }}
          role={selectedRole}
          parents={roles.map(r => ({ id: r.id, name: r.name }))}
          onSuccess={() => fetchRoles(1)}
        />
        <DeleteRoleDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          role={selectedRole}
          onSuccess={() => fetchRoles(1)}
        />
      </div>
    </>
  )
}
