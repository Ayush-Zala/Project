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
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const [isDeleting, setIsDeleting] = React.useState(false)

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
    if (!selectedRole) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/roles/${selectedRole.id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to purge role")
      }
      toast.success(`Role [${selectedRole.name}] purged from organizational manifest`)
      setIsDeleteDialogOpen(false)
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
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
        <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-red-500/20 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangleIcon className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold tracking-tight">Purge Team Role</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground/80 leading-relaxed">
              CRITICAL ACTION: You are about to permanently delete the role <span className="font-bold text-foreground">[{selectedRole?.name}]</span>.
              <br /><br />
              This will automatically purge all <span className="text-red-500 font-bold tracking-tighter">MEMBER ASSIGNMENTS</span> associated with this role. This operation cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-input">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-input hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all flex gap-2 active:scale-95"
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); handleDeleteRole(); }}
            >
              {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
