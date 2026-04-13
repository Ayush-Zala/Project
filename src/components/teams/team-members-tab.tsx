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
  const [selectedMembers, setSelectedMembers] = React.useState<any[]>([])
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isBulkToggling, setIsBulkToggling] = React.useState(false)

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
    const targets = selectedMembers.length > 0 ? selectedMembers : [selectedMember]
    if (targets.length === 0) return
    
    setIsDeleting(true)
    try {
      await Promise.all(targets.map(m => 
        fetch(`/api/teams/${teamId}/members/${m.id}`, { method: "DELETE" })
      ))
      
      toast.success(targets.length === 1 
        ? `User ${targets[0].user?.name} removed from team`
        : `${targets.length} members removed from team`
      )
      setIsDeleteDialogOpen(false)
      setSelectedMembers([])
      table.toggleAllRowsSelected(false)
      fetchMembers()
    } catch (error: any) {
      toast.error(error.message || "Failed to remove members")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkToggle = async (active: boolean) => {
    const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
    if (selected.length === 0) return
    
    setIsBulkToggling(true)
    try {
      await Promise.all(selected.map(m => 
        fetch(`/api/teams/${teamId}/members/${m.id}/toggle`, { method: "PATCH" })
      ))
      
      toast.success(`${selected.length} members marked as ${active ? 'active' : 'inactive'}`)
      table.toggleAllRowsSelected(false)
      fetchMembers()
    } catch (error: any) {
      toast.error("Failed to update status for some members")
    } finally {
      setIsBulkToggling(false)
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
              exportFilename="team-members"
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
        <AlertDialogContent className="sm:max-w-[440px] bg-background border-red-500/10 p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
          <div className="p-6">
            <AlertDialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-red-600 line-clamp-1">
                  {selectedMembers.length > 0 ? `Delete ${selectedMembers.length} Members` : `Delete: ${selectedMember?.user?.name}`}
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <div className="space-y-4">
               <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  This action is permanent and cannot be reversed. Deleting {selectedMembers.length > 0 ? "these members" : "this member"} will immediately remove all access within this team and purge all localized role assignments.
               </p>
            </div>

            <AlertDialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-red-500/5 mt-6 gap-2 sm:gap-0">
              <AlertDialogCancel 
                disabled={isDeleting} 
                className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all border-none bg-transparent shadow-none"
                onClick={() => setSelectedMembers([])}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                disabled={isDeleting}
                onClick={(e) => { e.preventDefault(); handleRemoveMember(); }}
              >
                {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ActionBar table={table}>
        <div className="flex items-center gap-1.5 px-2">
           <Button
             variant="ghost"
             size="sm"
             className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary px-3"
             onClick={() => {
               const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
               const allActive = selected.every(m => m.isActive)
               handleBulkToggle(!allActive)
             }}
             disabled={isBulkToggling}
           >
             {table.getFilteredSelectedRowModel().rows.map(r => r.original).every(m => m.isActive) ? "Mark Inactive" : "Mark Active"}
           </Button>
           
           <Separator orientation="vertical" className="h-4 bg-border/40 mx-1" />

           <Button
             variant="ghost"
             size="sm"
             className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive px-3"
             onClick={() => {
               const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
               setSelectedMembers(selected)
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
