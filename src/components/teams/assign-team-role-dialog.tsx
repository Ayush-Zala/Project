"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2Icon, ShieldCheckIcon } from "lucide-react"

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
      const res = await fetch(`/api/teams/${teamId}/roles`)
      const data = await res.json()
      setRoles(data || [])
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

      toast.success(`Role [${roles.find(r => r.id.toString() === selectedRoleId)?.name}] assigned to ${member.user?.name}`)
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
      <DialogContent className="sm:max-w-[480px] bg-popover/95 backdrop-blur-xl border-input shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Assign Team Role</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground/80">
             Authorize <span className="font-bold text-foreground">[{member?.user?.name}]</span> with localized capabilities within this team segment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Select Local Role</label>
            <Select value={selectedRoleId} onValueChange={(v) => setSelectedRoleId(v || "")} disabled={isLoadingRoles || roles.length === 0}>
               <SelectTrigger className="bg-background/50 border-input rounded-xl">
                  <SelectValue placeholder={isLoadingRoles ? "Synchronizing Manifest..." : "Choose a team role..."} />
               </SelectTrigger>
               <SelectContent className="bg-popover border-input">
                  {roles.filter(r => r.isActive).map(r => (
                     <SelectItem key={r.id} value={r.id.toString()} className="cursor-pointer">
                         <div className="flex flex-col">
                           <span className="font-bold">{r.name}</span>
                           <span className="text-[10px] text-muted-foreground italic">{r.description || "Localized authority manifest."}</span>
                        </div>
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
            {roles.length === 0 && !isLoadingRoles && (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">No active roles detected in this team.</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-input">
           <Button
             type="button"
             variant="ghost"
             onClick={() => onOpenChange(false)}
             className="rounded-xl hover:bg-muted/50"
           >
             Cancel
           </Button>
           <Button 
             onClick={handleAssign}
             disabled={isSubmitting || !selectedRoleId}
             className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
           >
             {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
             Update Authorization
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
