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
  organizationId: number
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
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserPlus2 className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Assign Members</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
                Add members to {teamName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
            <Input
              placeholder="Search organisation members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-muted/20 border-border/50 rounded-xl font-medium"
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/5 overflow-hidden">
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-3">
                  <Loader2 className="size-8 animate-spin text-primary/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Fetching members...</p>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground/30 p-8 text-center">
                  <Users2 className="size-12 mb-4 opacity-20" />
                  <p className="text-[11px] font-bold uppercase tracking-widest leading-tight">
                    {search ? "No matching members found" : "All organisation members are already in this team"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => toggleUser(m.userId)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
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
                        <span className="text-sm font-black text-foreground uppercase tracking-tight truncate">{m.user.name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider truncate">{m.user.email}</span>
                      </div>
                      {selectedUserIds.has(m.userId) && (
                        <CheckCircle2 className="size-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex items-center justify-between gap-4">
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">
              Selection
            </span>
            <span className="text-sm font-black text-primary tracking-tight">
              {selectedUserIds.size} Members Ready
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase tracking-wider text-[10px] h-10 px-6"
            >
              Cancel
            </Button>
            <Button
              disabled={selectedUserIds.size === 0 || isSaving}
              onClick={handleAssign}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-10 px-8 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Members"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
