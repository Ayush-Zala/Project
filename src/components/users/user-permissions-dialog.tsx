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
import { KeyIcon, RefreshCwIcon, UserIcon, SearchIcon, FilterIcon, InfoIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function UserPermissionsDialog({ open, onOpenChange, user }: UserPermissionsDialogProps) {
  const [allPermissions, setAllPermissions] = React.useState<any[]>([])
  const [rolePermissions, setRolePermissions] = React.useState<number[]>([])
  const [directIds, setDirectIds] = React.useState<number[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const loadData = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true)
    try {
      // 1. Fetch all active permissions
      const allRes = await fetch("/api/permissions/search")
      const allData = await allRes.json()
      setAllPermissions(allData.filter((p: any) => p.isActive))

      // 2. Fetch current direct permissions for this user
      const userRes = await fetch(`/api/users/${user.id}/permissions`)
      const userData = await userRes.json()
      setDirectIds(userData.map((up: any) => up.permissionId))

      // 3. Fetch permissions granted by user's role
      if (user.role?.id) {
          const roleRes = await fetch(`/api/roles/${user.role.id}/permissions`)
          const roleData = await roleRes.json()
          setRolePermissions(roleData.map((rp: any) => rp.permissionId))
      } else {
          setRolePermissions([])
      }
    } catch (error) {
      toast.error("Failed to load access control data")
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.role?.id])

  React.useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleToggle = (id: number) => {
    setDirectIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: directIds })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to synchronize permissions")
      
      toast.success(`Direct permissions for ${user.name} established`)
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col gap-0 p-0 border-input bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-muted/20 border-b border-input relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shrink-0 shadow-lg shadow-primary/5">
                {user?.image ? (
                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                <UserIcon className="h-6 w-6 text-primary" />
                )}
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
                Assign Permission: {user?.name}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 border-b border-border/20 flex gap-4 items-center">
             <div className="relative flex-1 group">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Search manifest..." 
                    className="pl-10 h-10 bg-background/50 border-input rounded-xl focus:ring-1 focus:ring-primary/20 text-sm font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <Badge variant="outline" className="h-10 px-4 rounded-xl border-input bg-background/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex gap-2">
                <FilterIcon className="h-3 w-3" />
                {directIds.length} DIRECT
             </Badge>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40" style={{ maxHeight: '55vh' }}>
          {isLoading ? (
            <div className="space-y-10 animate-pulse">
              {[1, 2].map((group) => (
                <div key={group} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-24 bg-primary/10 rounded-full" />
                    <Skeleton className="h-px w-full bg-primary/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-border/40 bg-muted/5 shadow-sm">
                        <Skeleton className="size-5 rounded-md shrink-0 opacity-40" />
                        <div className="space-y-3 w-full">
                          <Skeleton className="h-4 w-[60%] rounded-full opacity-60" />
                          <Skeleton className="h-3 w-[80%] rounded-full opacity-30" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                      const isDirect = directIds.includes(p.id);
                      const isViaRole = rolePermissions.includes(p.id);
                      
                      return (
                        <div 
                           key={p.id} 
                           onClick={() => !isViaRole && handleToggle(p.id)}
                           className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                             isDirect 
                               ? 'bg-primary/5 border-primary/30 shadow-primary/5' 
                               : isViaRole 
                               ? 'bg-background border-input cursor-not-allowed opacity-80' 
                               : 'bg-background hover:bg-background border-input'
                           }`}
                        >
                           <Checkbox 
                             checked={isDirect || isViaRole}
                             disabled={isViaRole}
                             onCheckedChange={() => !isViaRole && handleToggle(p.id)}
                             className={`mt-1 transition-transform ${isViaRole ? 'opacity-50' : 'group-active:scale-90'}`}
                           />
                           <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold transition-colors ${isDirect ? 'text-primary' : 'text-foreground'}`}>
                                    {p.name}
                                </span>
                                {isViaRole && (
                                    <Badge variant="secondary" className="text-[8px] h-4 px-1.5 bg-muted text-muted-foreground uppercase tracking-tighter">Via Role</Badge>
                                )}
                             </div>
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
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t border-input gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-input font-black uppercase tracking-widest text-[11px] px-8 h-11 hover:bg-background transition-all">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading} 
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-10 h-11 shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {isSaving ? <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" /> : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
