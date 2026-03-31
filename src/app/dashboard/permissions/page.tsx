"use client"

import * as React from "react"
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  KeyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  MoreVerticalIcon,
  PowerIcon,
  ShieldCheckIcon,
  ShieldIcon,
  MailIcon,
  UserIcon
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
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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
import { PermissionDialog } from "@/components/permissions/permission-dialog"
import { useHasPermission } from "@/hooks/use-has-permission"

export default function PermissionsPage() {
  const [permissions, setPermissions] = React.useState<any[]>([])
  const [pagination, setPagination] = React.useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog states
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false)
  const [selectedPermission, setSelectedPermission] = React.useState<any>(null)

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("permissions:create")
  const canUpdate = useHasPermission("permissions:update")
  const canDelete = useHasPermission("permissions:delete")
  const canToggle = useHasPermission("permissions:toggle")

  const fetchPermissions = React.useCallback(async (page: number = pagination.page, searchTerm: string = search) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/permissions?page=${page}&limit=${pagination.limit}&search=${searchTerm}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPermissions(data.permissions)
      setPagination(data.pagination)
    } catch (error: any) {
      toast.error(error.message || "Failed to load permissions")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.limit, search])

  // Real-time synchronization
  const { useEvent } = useSocket()
  useEvent("PERMISSIONS_CHANGED", React.useCallback(() => {
    fetchPermissions(pagination.page, search)
  }, [fetchPermissions, pagination.page, search]))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchPermissions(1, search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, fetchPermissions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPermissions(1)
    setIsRefreshing(false)
    toast.success("Permissions list updated")
  }

  const handleToggleStatus = async (permission: any) => {
    try {
      const res = await fetch(`/api/permissions/${permission.id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to toggle permission status")
      }

      const updated = await res.json()
      setPermissions(prev => prev.map(p => p.id === permission.id ? updated : p))
      toast.success(`${permission.name} is now ${updated.isActive ? 'active' : 'inactive'}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this permission permanently? This may break existing role assignments.")) return;
    
    try {
      const res = await fetch(`/api/permissions/${id}`, { method: "DELETE" })
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to delete permission")
      }
      toast.success("Permission deleted permanently")
      fetchPermissions(pagination.page)
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
                <BreadcrumbPage>Permissions</BreadcrumbPage>
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
                <KeyIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Permission Manifest</h1>
            </div>
            <p className="text-muted-foreground ml-11">Define and govern discrete access controls across the infrastructure.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources, actions..."
                className="pl-10 w-full md:w-[280px] bg-background/50 border-border/40 focus:border-primary/50 transition-all rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-border/40 hover:bg-muted/50 rounded-xl h-10 w-10 text-muted-foreground hover:text-primary transition-all active:scale-95"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {canCreate && (
              <Button
                onClick={() => { setSelectedPermission(null); setIsPermissionDialogOpen(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Define Permission</span>
              </Button>
            )}
          </div>
        </div>

        {/* Permissions Table */}
        <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCwIcon className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm font-medium tracking-widest uppercase">Fetching Manifest</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">ID</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Permission</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Slug (Resource:Action)</TableHead>
                {canToggle && (
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                )}
                {(canUpdate || canDelete) && (
                  <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/20">
                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                    {canToggle && <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>}
                    {(canUpdate || canDelete) && <TableCell><Skeleton className="h-10 w-full rounded-lg" /></TableCell>}
                  </TableRow>
                ))
              ) : permissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="p-4 bg-muted/20 rounded-full mb-2">
                         <ShieldCheckIcon className="h-10 w-10 text-muted-foreground/30" />
                       </div>
                       <p className="text-lg font-medium text-muted-foreground">Unauthorized Access: Permission manifest is hidden or empty</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((p) => (
                  <TableRow key={p.id} className="border-border/20 group hover:bg-primary/5 transition-colors">
                    <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground py-6">
                      #{String(p.id).slice(-4).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter op-60">
                          {p.description || 'System Resource Access Point'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] bg-muted/30 border-border/40 text-muted-foreground px-2 py-0.5">
                          {p.slug}
                        </Badge>
                      </div>
                    </TableCell>
                    {canToggle && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Switch
                             checked={p.isActive}
                             onCheckedChange={() => handleToggleStatus(p)}
                             className="data-[state=checked]:bg-primary"
                           />
                           <span className={`text-[10px] font-extrabold tracking-widest ${p.isActive ? 'text-green-500' : 'text-red-500'}`}>
                             {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                           </span>
                        </div>
                      </TableCell>
                    )}
                    {(canUpdate || canDelete) && (
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
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2 py-2">Definitions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border/40 my-1" />
                              
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => { setSelectedPermission(p); setIsPermissionDialogOpen(true); }}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                  <span className="font-medium">Edit Manifest</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>

                            {canDelete && (
                              <>
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(p.id)}
                                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                    <span className="font-bold">Purge Entry</span>
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 bg-muted/10 border-t border-border/40">
            <div className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-primary font-bold">{permissions.length}</span> of <span className="text-foreground font-bold">{pagination.total}</span> entries
          </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchPermissions(pagination.page - 1)}
                className="h-9 w-9 p-0 border-border/40 rounded-lg hover:bg-muted/50 transition-all hover:border-primary/50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === pagination.page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => fetchPermissions(p)}
                    className={`h-9 w-9 p-0 rounded-lg font-bold text-xs transition-all ${p === pagination.page ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'hover:bg-primary/10 hover:text-primary'}`}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchPermissions(pagination.page + 1)}
                className="h-9 w-9 p-0 border-border/40 rounded-lg hover:bg-muted/50 transition-all hover:border-primary/50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog for Create/Edit */}
        <PermissionDialog
          open={isPermissionDialogOpen}
          onOpenChange={(open) => {
            setIsPermissionDialogOpen(open);
            if (!open) setSelectedPermission(null);
          }}
          permission={selectedPermission}
          onSuccess={() => fetchPermissions(1)}
        />
      </div>
    </>
  )
}
