"use client"

import * as React from "react"
import {
  ShieldCheckIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  RefreshCwIcon,
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
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { TeamRoleDialog } from "./team-role-dialog"
import { useHasPermission } from "@/hooks/use-has-permission"

interface TeamRolesTabProps {
  teamId: string
  isActive: boolean
}

export function TeamRolesTab({ teamId, isActive }: TeamRolesTabProps) {
  const [roles, setRoles] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<any>(null)

  const canManage = useHasPermission("team_roles:create")
  const canUpdate = useHasPermission("team_roles:update")
  const canDelete = useHasPermission("team_roles:delete")
  const canToggle = useHasPermission("team_roles:toggle")

  const hasAnyAction = (canUpdate || canDelete)

  const fetchRoles = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/roles`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRoles(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load roles")
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Localized Roles</h2>
        </div>
        {canManage && isActive && (
          <Button 
            onClick={() => { setSelectedRole(null); setIsRoleDialogOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            New Local Role
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
              <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">ID</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Role Manifest</TableHead>
              {canToggle && (
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Status</TableHead>
              )}
              {hasAnyAction && (
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2 + (canToggle ? 1 : 0) + (hasAnyAction ? 1 : 0)} className="h-32 text-center text-muted-foreground italic">
                  No local roles defined for this team segment.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id} className="border-border/20 group hover:bg-primary/5 transition-colors">
                  <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground py-6">
                    #{role.id.toString().slice(-4).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">{role.name}</span>
                      <span className="text-[11px] text-muted-foreground/60 max-w-[400px] truncate">
                        {role.description || "Localized authority manifest."}
                      </span>
                    </div>
                  </TableCell>
                  {canToggle && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Switch
                          disabled={!canToggle || !isActive}
                          checked={role.isActive}
                          onCheckedChange={() => handleToggleStatus(role)}
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${role.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {role.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {hasAnyAction && (
                    <TableCell className="text-right pr-6">
                      {(isActive) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-muted group-hover:bg-muted transition-colors">
                                <MoreVerticalIcon className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-[160px] bg-popover border-border/40">
                            <DropdownMenuGroup>
                              {canUpdate && (
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                                  onClick={() => { setSelectedRole(role); setIsRoleDialogOpen(true); }}
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                  <span>Edit Role</span>
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer transition-colors py-2"
                                  onClick={() => { /* handleDelete */ }}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" />
                                  <span>Delete Role</span>
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

      <TeamRoleDialog 
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        teamId={teamId}
        role={selectedRole}
        onSuccess={fetchRoles}
      />
    </div>
  )
}
