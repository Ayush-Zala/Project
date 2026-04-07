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

interface TeamMembersTabProps {
  teamId: string
  isActive: boolean
}

export function TeamMembersTab({ teamId, isActive }: TeamMembersTabProps) {
  const [members, setMembers] = React.useState<any[]>([])
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

  const hasAnyAction = (canAssignRole || canDelete)

  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMembers(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load team members")
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      <div className="bg-background/40 border border-input rounded-2xl overflow-x-auto shadow-xl backdrop-blur-md relative">


        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-input hover:bg-transparent">
              <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">S.No</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Team Member</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Roles</TableHead>
              {canToggle && (
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Membership</TableHead>
              )}
              {hasAnyAction && (
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-border/20 hover:bg-transparent">
                  <TableCell className="py-6 px-4"><Skeleton className="h-6 w-full rounded-[6px] opacity-70" /></TableCell>
                  <TableCell className="py-6 px-4"><Skeleton className="h-6 w-10/12 rounded-[6px] opacity-70" /></TableCell>
                  <TableCell className="py-6 px-4"><Skeleton className="h-6 w-24 rounded-[6px] opacity-70" /></TableCell>
                  {canToggle && <TableCell className="py-6 px-4"><Skeleton className="h-6 w-full rounded-[6px] opacity-70" /></TableCell>}
                  {hasAnyAction && <TableCell className="py-6 px-4"><Skeleton className="h-6 w-8 ml-auto rounded-[6px] opacity-70" /></TableCell>}
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3 + (canToggle ? 1 : 0) + (hasAnyAction ? 1 : 0)} className="h-32 text-center text-muted-foreground italic">
                  No personnel detected in this organizational segment.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member, index) => (
                <TableRow key={member.id} className={`border-border/20 group hover:bg-primary/5 transition-colors ${!member.isActive ? 'opacity-60' : ''}`}>
                  <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground py-6">
                    #{index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="relative group/avatar">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xs">
                          {member.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{member.user?.name}</span>
                        <span className="text-[10px] text-muted-foreground tracking-tight font-medium uppercase">{member.user?.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                       {member.roles?.length > 0 ? (
                         member.roles.map((mr: any) => (
                           <Badge 
                            key={mr.role.id} 
                            variant="outline" 
                            className={`font-medium text-[8px] uppercase tracking-wide px-1.5 py-0 border-primary/20 text-primary bg-primary/5 shadow-sm ${!mr.role.isActive ? 'line-through opacity-50' : ''}`}
                           >
                              {mr.role.name}
                           </Badge>
                         ))
                       ) : (
                         <span className="text-[10px] text-muted-foreground italic">No roles assigned</span>
                       )}
                      </div>
                    </TableCell>
                  {canToggle && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Switch
                          disabled={!canToggle || !isActive}
                          checked={member.isActive}
                          onCheckedChange={() => handleToggleStatus(member)}
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${member.isActive ? 'text-primary' : 'text-muted-foreground/60'}`}>
                          {member.isActive ? 'Active Member' : 'Suspended'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {hasAnyAction && (
                    <TableCell className="text-right pr-6">
                      {(isActive && member.isActive) && (
                      <DropdownMenu>
                         <DropdownMenuTrigger
                           render={
                             <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-muted group-hover:bg-muted transition-colors">
                               <MoreVerticalIcon className="h-4 w-4" />
                             </Button>
                           }
                         />
                         <DropdownMenuContent align="end" className="w-[180px] bg-popover border-input">
                           <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 flex items-center justify-between">
                                Membership Control
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border/40" />
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                                onClick={() => { setSelectedMember(member); setIsAssignDialogOpen(true); }}
                              >
                                <ShieldIcon className="h-3.5 w-3.5" />
                                <span>Assign Team Role</span>
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator className="bg-border/40" />
                              {canDelete && (
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer transition-colors py-2"
                                  onClick={() => { setSelectedMember(member); setIsDeleteDialogOpen(true); }}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" />
                                  <span>Remove from Team</span>
                                </DropdownMenuItem>
                              )}
                           </DropdownMenuGroup>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


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
