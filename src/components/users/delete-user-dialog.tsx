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
import { toast } from "sonner"
import { Loader2Icon, AlertTriangleIcon } from "lucide-react"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
  onSuccess: () => void
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function onDelete() {
    if (!user) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete user")
      }

      toast.success("User account permanently deleted")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-red-900/20">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangleIcon className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold tracking-tight">Destructive Action</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pt-2">
            You are about to permanently delete 
            <span className="font-bold text-foreground px-1">"{user?.name}"</span> 
            ({user?.email}). This will immediately invalidate all active sessions and delete the login account. This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-border/40 hover:bg-muted/50 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={isDeleting}
            className="min-w-[120px] bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20"
          >
            {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Delete Forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
