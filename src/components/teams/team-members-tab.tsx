"use client"

import * as React from "react"
import {
  UsersIcon,
  UserPlusIcon,
  MoreVerticalIcon,
  Trash2Icon,
  RefreshCwIcon,
  ShieldIcon,
  ToggleLeftIcon,
  PowerIcon,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { AddMemberDialog } from "./add-member-dialog"
import { AssignTeamRoleDialog } from "./assign-team-role-dialog"
import { useHasPermission } from "@/hooks/use-has-permission"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getMemberColumns } from "./member-table-columns"
import { DataTableFilterField } from "@/types/data-table"

interface TeamMembersTabProps {
  teamId: string
  isActive: boolean
}

export function TeamMembersTab({ teamId, isActive }: TeamMembersTabProps) {
  const [members, setMembers] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<any>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const canManage = useHasPermission("team_members:create")
  const canUpdate = useHasPermission("team_members:update")
  const canDelete = useHasPermission("team_members:delete")
  const canToggle = useHasPermission("team_members:toggle")
  const canAssignRole = useHasPermission("team_members:assign_role")

  const columns = React.useMemo(() => getMemberColumns({
    onAssignRole: (m) => { setSelectedMember(m); setIsAssignDialogOpen(true); },
    onRemove: (m) => { setSelectedMember(m); setIsDeleteDialogOpen(true); },
    onToggleStatus: (m) => handleToggleStatus(m),
    isTeamActive: isActive,
    capabilities: { canDelete, canToggle, canAssignRole }
  }), [canDelete, canToggle, canAssignRole, isActive])

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
    data: members,
    columns,
    pageCount,
  })

  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const res = await fetch(`/api/teams/${teamId}/members?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMembers(data.members)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load team members")
    } finally {
      setIsLoading(false)
    }
  }, [teamId, page, perPage, sort, search, filters])

  const { useEvent } = useSocket()
  useEvent("TEAM_MEMBERS_CHANGED", React.useCallback((data: any) => {
     if (String(data.teamId) === teamId) fetchMembers()
  }, [teamId, fetchMembers]))

  React.useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleToggleStatus = async (member: any) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${member.id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to toggle status")
      }
      const updated = await res.json()
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, isActive: updated.isActive } : m))
      toast.success(`${member.user?.name} is now ${updated.isActive ? 'active' : 'suspended'} in this team`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${selectedMember.id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to remove member")
      }
      toast.success(`User ${selectedMember.user?.name} removed from team`)
      setIsDeleteDialogOpen(false)
      fetchMembers()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "user.name", variant: "text" },
    { label: "Email", id: "user.email", variant: "text" },
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


      <AssignTeamRoleDialog 
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        teamId={teamId}
        member={selectedMember}
        onSuccess={fetchMembers}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-red-500/20 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangleIcon className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold tracking-tight">Revoke Membership</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground/80 leading-relaxed">
              Confirm removal of <span className="font-bold text-foreground">[{selectedMember?.user?.name}]</span> from this organizational unit.
              <br /><br />
              All role assignments for this member within this team will be permanently purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-input">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-input hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all flex gap-2 active:scale-95"
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); handleRemoveMember(); }}
            >
              {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
