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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon, UserPlusIcon, SearchIcon } from "lucide-react"
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

      toast.success("User added to team manifest")
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
      <DialogContent className="sm:max-w-[480px] bg-popover/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlusIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Add Team Member</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground/80">
            Search for an existing user to bind them to this organizational segment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Search Account</label>
            <div className="relative">
               <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Search by name or email..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="pl-10 bg-background/50 border-border/40 focus:border-primary/50 rounded-xl"
               />
               {isLoadingUsers && <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Select User</label>
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v || "")} disabled={users.length === 0}>
               <SelectTrigger className="bg-background/50 border-border/40 rounded-xl">
                  <SelectValue placeholder={users.length === 0 ? "Search for users above..." : "Select a user to add"} />
               </SelectTrigger>
               <SelectContent className="bg-popover border-border/40">
                  {users.map(u => (
                     <SelectItem key={u.id} value={u.id.toString()} className="cursor-pointer">
                        <div className="flex flex-col">
                           <span className="font-bold">{u.name}</span>
                           <span className="text-[10px] text-muted-foreground italic">{u.email}</span>
                        </div>
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/40">
           <Button
             type="button"
             variant="ghost"
             onClick={() => onOpenChange(false)}
             className="rounded-xl hover:bg-muted/50"
           >
             Cancel
           </Button>
           <Button 
             onClick={handleAdd}
             disabled={isSubmitting || !selectedUserId}
             className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
           >
             {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
             Add to Team
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
