"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2Icon, AlertTriangleIcon } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface BulkDeleteTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: any[]
  organizationId: string
  onSuccess: () => void
}

export function BulkDeleteTeamDialog({ 
  open, 
  onOpenChange, 
  teams, 
  organizationId,
  onSuccess 
}: BulkDeleteTeamDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function onDelete() {
    if (!teams.length || !organizationId) return
    setIsDeleting(true)
    try {
      const ids = teams.map(t => t.id)
      
      await Promise.all(ids.map(id => 
        apiClient(`/api/organisations/${organizationId}/teams/${id}`, { 
          method: "DELETE" 
        })
      ))

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      // apiClient already handles the toast
    } finally {
      setIsDeleting(false)
    }
  }

  const teamNames = teams.map(t => t.name).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-background border-red-500/10 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangleIcon className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-red-600 line-clamp-1">
                Delete: {teamNames}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
             <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                This action is permanent and cannot be reversed. Deleting the selected teams will immediately dissolve all member assignments and access hierarchies associated with them.
             </p>
          </div>

          <DialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-red-500/5 mt-6 gap-2 sm:gap-0">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all font-bold"
            >
                Cancel
            </Button>
            <Button 
                type="button" 
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
                {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
