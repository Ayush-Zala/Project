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
  Loader2
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"


interface AssignCompanyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  companyIds: number[]
  companyNames?: string[]
  onSuccess: () => void
}

export function AssignCompanyMemberDialog({
  open,
  onOpenChange,
  organizationId,
  companyIds = [],
  companyNames = [],
  onSuccess
}: AssignCompanyMemberDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [members, setMembers] = React.useState<any[]>([])
  const [search, setSearch] = React.useState("")
  const [selectedMemberId, setSelectedMemberId] = React.useState<number | null>(null)

  const isBulk = companyIds.length > 1
  const displayTitle = isBulk ? `Assign ${companyIds.length} Companies` : `Assign Member`
  const displayDescription = isBulk 
    ? `Select one member to manage ${companyIds.length} selected records` 
    : `Select one member for ${companyNames[0] || "this company"}`

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch members for selection
      const membersData = await apiClient(`/api/organisations/${organizationId}/members?per_page=1000`)
      setMembers(membersData.members || [])

      // If single company, fetch its current owner
      if (companyIds.length === 1) {
        const assignedData = await apiClient(`/api/organisations/${organizationId}/companies/assign?companyId=${companyIds[0]}`)
        const assignments = assignedData.assignments || []
        if (assignments.length > 0) {
          setSelectedMemberId(assignments[0].organizationMemberId)
        } else {
          setSelectedMemberId(null)
        }
      } else {
        setSelectedMemberId(null) // Reset for bulk
      }
    } catch (error: any) {
      // apiClient handled toast
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, companyIds])

  React.useEffect(() => {
    if (open && companyIds.length > 0) {
      fetchData()
      setSearch("")
    }
  }, [open, companyIds, fetchData])

  const filteredMembers = members.filter(m => 
    m.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!selectedMemberId) return
    setIsSaving(true)
    try {
      await apiClient(`/api/organisations/${organizationId}/companies/assign`, {
        method: "POST",
        body: JSON.stringify({ 
            companyIds: companyIds,
            memberId: selectedMemberId 
        })
      })
      toast.success(isBulk ? `Ownership updated for ${companyIds.length} companies` : `Access updated for ${companyNames[0]}`)
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
              {displayTitle}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
              {displayDescription}
            </DialogDescription>
          </DialogHeader>
...

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Search staff members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-muted/20 border-border/50 rounded-lg font-bold text-xs transition-all focus:border-primary/50"
              />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/5 overflow-hidden">
              <ScrollArea className="h-[280px]">
                {isLoading ? (
                  <div className="p-2 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-md">
                        <Skeleton className="size-4 rounded-full" />
                        <div className="flex flex-col gap-2 flex-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground/30 p-8 text-center">
                    <Users2 className="size-10 mb-4 opacity-20" />
                    <p className="text-[11px] font-bold uppercase tracking-widest leading-tight">
                      {search ? "No matches" : "No members found"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMemberId(m.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all ${
                          selectedMemberId === m.id 
                            ? 'bg-primary/10 border-primary/20 shadow-sm' 
                            : 'hover:bg-muted/50 border-transparent hover:border-border/30'
                        } border`}
                      >
                        <div className={`size-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedMemberId === m.id ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {selectedMemberId === m.id && <div className="size-2 rounded-full bg-primary" />}
                        </div>
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
            disabled={!selectedMemberId || isSaving}
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Assign Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
