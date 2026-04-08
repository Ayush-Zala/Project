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
import { authClient } from "@/lib/auth-client"

interface DeleteOrganisationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organisation: any
  onSuccess?: () => void
}

export function DeleteOrganisationDialog({ open, onOpenChange, organisation, onSuccess }: DeleteOrganisationDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function onDelete() {
    if (!organisation) return
    setIsDeleting(true)
    const toastId = toast.loading(`Deleting ${organisation.name}...`)
    try {
      const { error } = await authClient.organization.delete({ 
        organizationId: String(organisation.id) 
      })

      if (error) throw new Error(error.message)

      toast.success("Organization permanently deleted", { id: toastId })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
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
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">Industrial Purge</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pt-2 font-medium leading-relaxed">
            This action is irreversible. You are about to permanently delete the 
            <span className="font-bold text-foreground px-1.5 underline decoration-red-500/30 whitespace-nowrap">"{organisation?.name}"</span> 
            workspace. All members, teams, and data nodes will be decoupled and purged.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-8 gap-3 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none font-bold uppercase tracking-widest text-[10px] hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 sm:flex-none min-w-[120px] bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-900/20 active:scale-95 transition-all"
          >
            {isDeleting ? <Loader2Icon className="h-3 w-3 animate-spin" /> : "Purge Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
