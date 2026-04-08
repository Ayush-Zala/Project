"use client"

import * as React from "react"
import {
  ShieldCheckIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  RefreshCwIcon,
  AlertTriangleIcon,
  Loader2Icon,
  CircleCheckIcon,
  CircleOffIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionBar } from "@/components/data-table/action-bar"
import { Separator } from "@/components/ui/separator"
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
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { TeamRoleDialog } from "./team-role-dialog"
import { useHasPermission } from "@/hooks/use-has-permission"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getRoleColumns } from "./role-table-columns"
import { DataTableFilterField } from "@/types/data-table"

interface TeamRolesTabProps {
  teamId: string
  isActive: boolean
}

export function TeamRolesTab({ teamId, isActive }: TeamRolesTabProps) {
  const [roles, setRoles] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<any>(null)
  const [selectedRoles, setSelectedRoles] = React.useState<any[]>([])
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isBulkToggling, setIsBulkToggling] = React.useState(false)

  const canManage = useHasPermission("team_roles:create")
  const canUpdate = useHasPermission("team_roles:update")
  const canDelete = useHasPermission("team_roles:delete")
  const canToggle = useHasPermission("team_roles:toggle")

  const columns = React.useMemo(() => getRoleColumns({
    onEdit: (r) => { setSelectedRole(r); setIsRoleDialogOpen(true); },
    onDelete: (r) => { setSelectedRole(r); setIsDeleteDialogOpen(true); },
    onToggleStatus: (r) => handleToggleStatus(r),
    isTeamActive: isActive,
    capabilities: { canUpdate, canDelete, canToggle }
  }), [canUpdate, canDelete, canToggle, isActive])

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

      const res = await fetch(`/api/teams/${teamId}/roles?${params.toString()}`)
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
  }, [teamId, page, perPage, sort, search, filters])

  const { useEvent } = useSocket()
  useEvent("TEAM_ROLES_CHANGED", React.useCallback((data: any) => {
    if (String(data.teamId) === teamId) fetchRoles()
  }, [teamId, fetchRoles]))

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleToggleStatus = async (role: any) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/roles/${role.id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to toggle status")
      }
      const updated = await res.json()
      setRoles(prev => prev.map(r => r.id === role.id ? { ...r, isActive: updated.isActive } : r))
      toast.success(`Role [${role.name}] is now ${updated.isActive ? 'active' : 'suspended'}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeleteRole = async () => {
    const targets = selectedRoles.length > 0 ? selectedRoles : [selectedRole]
    if (targets.length === 0) return
    
    setIsDeleting(true)
    try {
      await Promise.all(targets.map(r => 
        fetch(`/api/teams/${teamId}/roles/${r.id}`, { method: "DELETE" })
      ))
      
      toast.success(targets.length === 1 
        ? `Role [${targets[0].name}] purged from organizational manifest`
        : `${targets.length} roles purged from organizational manifest`
      )
      setIsDeleteDialogOpen(false)
      setSelectedRoles([])
      table.toggleAllRowsSelected(false)
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message || "Failed to purge roles")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkToggle = async (active: boolean) => {
    const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
    if (selected.length === 0) return
    
    setIsBulkToggling(true)
    try {
      await Promise.all(selected.map(r => 
        fetch(`/api/teams/${teamId}/roles/${r.id}/toggle`, { method: "PATCH" })
      ))
      
      toast.success(`${selected.length} roles marked as ${active ? 'active' : 'inactive'}`)
      table.toggleAllRowsSelected(false)
      fetchRoles()
    } catch (error: any) {
      toast.error("Failed to update status for some roles")
    } finally {
      setIsBulkToggling(false)
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
        { label: "Suspended", value: "false" }
      ]
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <DataTable
          table={table}
          isLoading={isLoading}
          isSearchActive={!!search}
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

      <TeamRoleDialog 
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        teamId={teamId}
        role={selectedRole}
        onSuccess={fetchRoles}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[440px] bg-background border-red-500/10 p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
          <div className="p-6">
            <AlertDialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-red-600 line-clamp-1">
                  {selectedRoles.length > 0 ? `Delete ${selectedRoles.length} Roles` : `Delete: ${selectedRole?.name}`}
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <div className="space-y-4">
               <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  This action is permanent and cannot be reversed. Deleting {selectedRoles.length > 0 ? "these roles" : "this role"} will immediately remove {selectedRoles.length > 0 ? "them" : "it"} from all assigned members and purge authority manifests from the team configuration.
               </p>
            </div>

            <AlertDialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-red-500/5 mt-6 gap-2 sm:gap-0">
              <AlertDialogCancel 
                disabled={isDeleting} 
                className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all border-none bg-transparent shadow-none"
                onClick={() => setSelectedRoles([])}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                disabled={isDeleting}
                onClick={(e) => { e.preventDefault(); handleDeleteRole(); }}
              >
                {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ActionBar table={table}>
        <div className="flex items-center gap-1.5 px-2">
           {table.getFilteredSelectedRowModel().rows.length === 1 && (
             <>
               <Button
                 variant="ghost"
                 size="sm"
                 className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary px-3"
                 onClick={() => {
                   const selected = table.getFilteredSelectedRowModel().rows[0].original
                   setSelectedRole(selected)
                   setIsRoleDialogOpen(true)
                 }}
               >
                 Edit
               </Button>
               <Separator orientation="vertical" className="h-4 bg-border/40 mx-1" />
             </>
           )}

           <Button
             variant="ghost"
             size="sm"
             className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary px-3"
             onClick={() => {
               const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
               const allActive = selected.every(r => r.isActive)
               handleBulkToggle(!allActive)
             }}
             disabled={isBulkToggling}
           >
             {table.getFilteredSelectedRowModel().rows.map(r => r.original).every(r => r.isActive) ? "Mark Inactive" : "Mark Active"}
           </Button>
           
           <Separator orientation="vertical" className="h-4 bg-border/40 mx-1" />

           <Button
             variant="ghost"
             size="sm"
             className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive px-3"
             onClick={() => {
               const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
               setSelectedRoles(selected)
               setIsDeleteDialogOpen(true)
             }}
             disabled={isBulkToggling || isDeleting}
           >
             Delete
           </Button>
        </div>
      </ActionBar>
    </div>
  )
}
