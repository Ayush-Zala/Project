"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { KeyIcon, RefreshCwIcon, ShieldCheckIcon, SearchIcon, FilterIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: any;
}

export function RolePermissionsDialog({ open, onOpenChange, role }: RolePermissionsDialogProps) {
  const [allPermissions, setAllPermissions] = React.useState<any[]>([])
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const loadData = React.useCallback(async () => {
    if (!role?.id) return;
    setIsLoading(true)
    try {
      // 1. Fetch all active permissions
      const allRes = await fetch("/api/permissions/search")
      const allData = await allRes.json()
      setAllPermissions(allData.filter((p: any) => p.isActive))

      // 2. Fetch current permissions for this role
      const roleRes = await fetch(`/api/roles/${role.id}/permissions`)
      const roleData = await roleRes.json()
      setSelectedIds(roleData.map((rp: any) => rp.permissionId))
    } catch (error) {
      toast.error("Failed to load permissions manifest")
    } finally {
      setIsLoading(false)
    }
  }, [role?.id])

  React.useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/roles/${role.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: selectedIds })
      })

      if (!res.ok) throw new Error("Failed to synchronize permissions")
      
      toast.success(`Access manifest for ${role.name} synchronized`)
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredPermissions = allPermissions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedPermissions = filteredPermissions.reduce((acc: any, p) => {
    const resource = p.resource || "General";
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col gap-0 p-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-muted/20 border-b border-border/40 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12" />
          <div className="flex items-center gap-4 relative z-10">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xl shadow-primary/10"
              style={{ backgroundColor: role?.colorCode || '#3b82f6' }}
            >
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                Govern Access: {role?.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Synchronize permissions for the <span className="text-primary font-bold">#{role?.slug}</span> entity.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 bg-muted/10 border-b border-border/20 flex gap-4 items-center">
             <div className="relative flex-1 group">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Filter by resource or capability..." 
                    className="pl-10 h-10 bg-background/50 border-border/40 rounded-xl focus:ring-1 focus:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <Badge variant="outline" className="h-10 px-4 rounded-xl border-border/40 bg-background/50 text-[10px] font-bold tracking-widest text-muted-foreground flex gap-2">
                <FilterIcon className="h-3 w-3" />
                {selectedIds.length} SELECTED
             </Badge>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40" style={{ maxHeight: '60vh' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <RefreshCwIcon className="h-10 w-10 text-primary animate-spin" />
              <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">Accessing Infrastructure</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedPermissions).map(([resource, perms]: [string, any]) => (
                <div key={resource} className="space-y-4">
                  <div className="flex items-center gap-3">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary whitespace-nowrap">{resource}</h3>
                     <div className="h-[1px] w-full bg-primary/10" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perms.map((p: any) => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <div 
                           key={p.id} 
                           onClick={() => handleToggle(p.id)}
                           className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                             isSelected 
                               ? 'bg-primary/5 border-primary/30 shadow-primary/5' 
                               : 'bg-background hover:bg-muted/30 border-border/40'
                           }`}
                        >
                           <Checkbox 
                             checked={isSelected}
                             onCheckedChange={() => handleToggle(p.id)}
                             className="mt-1 transition-transform group-active:scale-90"
                           />
                           <div className="flex flex-col gap-1">
                             <span className={`text-sm font-bold transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                               {p.name}
                             </span>
                             <code className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-md w-fit">
                               {p.slug}
                             </code>
                           </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              
              {filteredPermissions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 gap-2 opacity-40">
                    <KeyIcon className="h-10 w-10 text-muted-foreground" />
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">No matches in manifest</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t border-border/40 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-border/40 font-bold px-6 h-11 hover:bg-background">
            Discard Changes
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading} 
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold px-10 h-11 shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {isSaving && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
            Deploy Governance Manifest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
