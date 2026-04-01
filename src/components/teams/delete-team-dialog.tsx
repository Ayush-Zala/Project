"use client"

import * as React from "react"
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
import { Loader2Icon, AlertTriangleIcon } from "lucide-react"

interface DeleteTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: any
  onSuccess: () => void
}

export function DeleteTeamDialog({ open, onOpenChange, team, onSuccess }: DeleteTeamDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    if (!team) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to purge team")
      }

      toast.success(`Team [${team.name}] purged from manifest`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-red-500/20 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-red-500 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangleIcon className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight">Purge Team Manifest</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground/80 leading-relaxed">
            CRITICAL ACTION: You are about to permanently delete the team <span className="font-bold text-foreground">[{team?.name}]</span>.
            <br /><br />
            This will automatically purge all associated <span className="text-red-500 font-bold tracking-tighter">TEAM ROLES</span> and <span className="text-red-500 font-bold tracking-tighter">MEMBERSHIP BINDINGS</span>. This operation cannot be reversed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4 border-t border-border/40">
          <AlertDialogCancel className="rounded-xl border-border/40 hover:bg-muted/50">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              handleDelete()
            }}
            className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all flex gap-2 active:scale-95"
            disabled={isDeleting}
          >
            {isDeleting && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Confirm Purge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
