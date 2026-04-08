"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

interface AssignTeamRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  member?: any
  onSuccess: () => void
}

export function AssignTeamRoleDialog({ open, onOpenChange, teamId, member, onSuccess }: AssignTeamRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [roles, setRoles] = React.useState<any[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(false)
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("")

  const fetchRoles = React.useCallback(async () => {
    setIsLoadingRoles(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/roles?per_page=100`)
      const data = await res.json()
      setRoles(data.roles || [])
    } catch (error) {
      console.error("Failed to fetch team roles", error)
    } finally {
      setIsLoadingRoles(false)
    }
  }, [teamId])

  React.useEffect(() => {
    if (open) fetchRoles()
  }, [open, fetchRoles])

  async function handleAssign() {
    if (!selectedRoleId || !member) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${member.id}/assign-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: Number(selectedRoleId) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to assign role")
      }

      toast.success(`Role assigned to ${member.user?.name}`)
      onSuccess()
      onOpenChange(false)
      setSelectedRoleId("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Assign Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Select Role</label>
              <Select value={selectedRoleId} onValueChange={(v) => setSelectedRoleId(v || "")} disabled={isLoadingRoles || roles.length === 0}>
                 <SelectTrigger className="w-full bg-background border-input h-10 font-bold text-xs transition-all">
                    <SelectValue placeholder={isLoadingRoles ? "Synchronizing Manifest..." : "Choose a team role..."} />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-input">
                    {roles.filter(r => r.isActive).map(r => (
                       <SelectItem key={r.id} value={r.id.toString()} className="cursor-pointer">
                          <div className="flex flex-col py-0.5">
                            <span className="font-bold text-[11px]">{r.name}</span>
                            <span className="text-[9px] text-muted-foreground lowercase italic font-medium">{r.description || "No description provided."}</span>
                         </div>
                       </SelectItem>
                    ))}
                 </SelectContent>
              </Select>
              {roles.length === 0 && !isLoadingRoles && (
                <p className="text-[10px] text-destructive font-black uppercase tracking-tight mt-1">No active roles detected in this team.</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-muted/5 mt-6 gap-2 sm:gap-0">
             <Button
               type="button"
               variant="ghost"
               onClick={() => onOpenChange(false)}
               className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-muted/50"
             >
               Cancel
             </Button>
             <Button 
               onClick={handleAssign}
               disabled={isSubmitting || !selectedRoleId}
               className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
             >
               {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Assign"}
             </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
