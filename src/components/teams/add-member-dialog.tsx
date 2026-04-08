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
import { Loader2Icon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onSuccess: () => void
}

export function AddMemberDialog({ open, onOpenChange, teamId, onSuccess }: AddMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [users, setUsers] = React.useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")

  const fetchUsers = React.useCallback(async (term: string) => {
    if (!term || term.length < 2) {
        setUsers([])
        return
    }
    setIsLoadingUsers(true)
    try {
      const res = await fetch(`/api/users?search=${term}&limit=5`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => {
        fetchUsers(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchUsers])

  async function handleAdd() {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(selectedUserId) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add member")
      }

      toast.success("Member added successfully")
      onSuccess()
      onOpenChange(false)
      setSelectedUserId("")
      setSearch("")
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
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Add Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Search User</label>
              <div className="relative">
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                 <Input 
                   placeholder="Search by name or email..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="pl-9 bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10"
                 />
                 {isLoadingUsers && <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">User Result</label>
              <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v || "")} disabled={users.length === 0}>
                 <SelectTrigger className="w-full bg-background border-input h-10 font-bold text-xs transition-all">
                    <SelectValue placeholder={users.length === 0 ? "Search for users above..." : "Select a user to add"} />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-input">
                    {users.map(u => (
                       <SelectItem key={u.id} value={u.id.toString()} className="cursor-pointer">
                          <div className="flex flex-col">
                             <span className="font-bold text-[11px]">{u.name}</span>
                             <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">{u.email}</span>
                          </div>
                       </SelectItem>
                    ))}
                 </SelectContent>
              </Select>
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
               onClick={handleAdd}
               disabled={isSubmitting || !selectedUserId}
               className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
             >
               {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Add to Team"}
             </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
