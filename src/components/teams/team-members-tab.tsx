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
import { Switch } from "@/components/ui/switch"
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
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<any>(null)

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Team Personnel</h2>
        </div>
        {canManage && isActive && (
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
          >
            <UserPlusIcon className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
             <RefreshCwIcon className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">S.No</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Team Member</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Localized Roles</TableHead>
              {canToggle && (
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Membership</TableHead>
              )}
              {hasAnyAction && (
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
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
                            className={`font-black text-[8px] uppercase tracking-tighter px-1.5 py-0 border-primary/20 text-primary bg-primary/5 shadow-sm ${!mr.role.isActive ? 'line-through opacity-50' : ''}`}
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
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${member.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
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
                         <DropdownMenuContent align="end" className="w-[180px] bg-popover border-border/40">
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
                                  onClick={() => { /* handleRemoveMember */ }}
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

      <AddMemberDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        teamId={teamId}
        onSuccess={fetchMembers}
      />

      <AssignTeamRoleDialog 
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        teamId={teamId}
        member={selectedMember}
        onSuccess={fetchMembers}
      />
    </div>
  )
}
