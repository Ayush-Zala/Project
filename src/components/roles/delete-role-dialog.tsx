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

interface DeleteRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: any
  onSuccess: () => void
}

export function DeleteRoleDialog({ open, onOpenChange, role, onSuccess }: DeleteRoleDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function onDelete() {
    if (!role) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete role")
      }

      toast.success("Role permanently deleted")
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
            <DialogTitle className="text-xl font-bold">Caution: Permanent Deletion</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pt-2">
            This action cannot be undone. You are about to permanently delete the 
            <span className="font-bold text-foreground px-1">"{role?.name}"</span> 
            role. This may affect user permissions and system access.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-input hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={isDeleting}
            className="min-w-[100px] bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Delete Forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
