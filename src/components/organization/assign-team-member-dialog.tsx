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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Users2, 
  Search, 
  Loader2, 
  UserPlus2,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AssignTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  teamId: number
  teamName: string
  onSuccess: () => void
  existingMemberUserIds: number[]
}

export function AssignTeamMemberDialog({
  open,
  onOpenChange,
  organizationId,
  teamId,
  teamName,
  onSuccess,
  existingMemberUserIds
}: AssignTeamMemberDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [members, setMembers] = React.useState<any[]>([])
  const [search, setSearch] = React.useState("")
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<number>>(new Set())

  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient(`/api/organisations/${organizationId}/members?per_page=1000`)
      setMembers(data.members || [])
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  React.useEffect(() => {
    if (open) {
      fetchMembers()
      setSelectedUserIds(new Set())
      setSearch("")
    }
  }, [open, fetchMembers])

  const availableMembers = members.filter(m => 
    !existingMemberUserIds.includes(m.userId) &&
    (m.user.name.toLowerCase().includes(search.toLowerCase()) || 
     m.user.email.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleUser = (userId: number) => {
    const next = new Set(selectedUserIds)
    if (next.has(userId)) {
      next.delete(userId)
    } else {
      next.add(userId)
    }
    setSelectedUserIds(next)
  }

  const handleAssign = async () => {
    if (selectedUserIds.size === 0) return
    setIsSaving(true)
    try {
      await apiClient(`/api/organisations/${organizationId}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
      })
      toast.success(`Succesfully assigned ${selectedUserIds.size} members to ${teamName}`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6 pb-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
              Assign Members
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
              Add members to {teamName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Search organisation members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-muted/20 border-border/50 rounded-lg font-bold text-xs transition-all focus:border-primary/50"
              />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/5 overflow-hidden">
              <ScrollArea className="h-[280px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-3">
                    <Loader2 className="size-6 animate-spin text-primary/40" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Fetching data...</p>
                  </div>
                ) : availableMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground/30 p-8 text-center">
                    <Users2 className="size-10 mb-4 opacity-20" />
                    <p className="text-[11px] font-bold uppercase tracking-widest leading-tight">
                      {search ? "No matching records" : "All members assigned"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {availableMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleUser(m.userId)}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all ${
                          selectedUserIds.has(m.userId) 
                            ? 'bg-primary/10 border-primary/20' 
                            : 'hover:bg-muted/50 border-transparent'
                        } border`}
                      >
                        <Checkbox 
                          checked={selectedUserIds.has(m.userId)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">{m.user.name}</span>
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">{m.user.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-6 pb-6 border-t border-border/10 bg-muted/5 mt-2 px-6 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-muted/50 transition-all font-bold"
          >
            Cancel
          </Button>
          <Button
            disabled={selectedUserIds.size === 0 || isSaving}
            onClick={handleAssign}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
