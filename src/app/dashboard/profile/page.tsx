"use client"

import * as React from "react"
import { 
  UserCircleIcon, 
  MailIcon, 
  KeyIcon, 
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  RefreshCwIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  
  // Password form states
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/users/profile")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProfile(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string

    setIsUpdatingProfile(true)
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setProfile((prev: any) => ({ ...prev, name: data.user.name }))
      toast.success("Identity updated successfully")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const currentPassword = formData.get("currentPassword") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match")
    }

    setIsChangingPassword(true)
    try {
      const res = await fetch("/api/users/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      toast.success("Security credentials updated")
      e.currentTarget.reset()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <RefreshCwIcon className="h-12 w-12 text-primary animate-spin" />
            <span className="text-sm font-medium tracking-widest uppercase animate-pulse">Initializing Dashboard</span>
         </div>
      </div>
    )
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Profile & Identity</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-10 p-8 max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-2 bg-muted/20 p-8 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="flex items-center gap-4 relative z-10">
             <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <UserCircleIcon className="h-8 w-8 text-primary" />
             </div>
             <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Command Profile</h1>
                <p className="text-muted-foreground">Manage your identity and authentication settings.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Identity Card */}
          <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            <div className="p-6 border-b border-border/40 flex items-center gap-3 bg-muted/30">
               <UserCircleIcon className="h-5 w-5 text-primary" />
               <span className="font-bold uppercase tracking-widest text-xs">Personal Access Manifest</span>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-8 flex flex-col gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Account Display Name</label>
                <div className="relative group">
                  <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="profile-name-input"
                    name="name"
                    value={profile?.name || ""}
                    onChange={(e) => setProfile((prev: any) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your command name..." 
                    className="pl-10 bg-muted/30 border-border/40 focus:border-primary/50 transition-all rounded-xl h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Registered Email (Readonly)</label>
                <div className="relative group opacity-60">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input 
                    value={profile?.email}
                    readOnly
                    className="pl-10 bg-muted/10 border-border/20 rounded-xl h-12 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic ml-1 mt-1">Identity validation is tied to this permanent email manifest.</p>
              </div>

              <Button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="mt-4 bg-primary text-primary-foreground font-bold rounded-xl h-12 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                {isUpdatingProfile ? (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                    UPDATING MANIFEST...
                  </>
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-4 w-4" />
                    UPDATE IDENTITY
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Security Card */}
          <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            <div className="p-6 border-b border-border/40 flex items-center gap-3 bg-muted/30">
               <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
               <span className="font-bold uppercase tracking-widest text-xs">Security Protocol Access</span>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8 flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Current Password</label>
                <div className="relative group">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type={showCurrent ? "text" : "password"}
                    name="currentPassword"
                    placeholder="••••••••" 
                    className="pl-10 pr-10 bg-muted/30 border-border/40 focus:border-primary/50 transition-all rounded-xl h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">New Secure Password</label>
                <div className="relative group">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    placeholder="••••••••" 
                    className="pl-10 pr-10 bg-muted/30 border-border/40 focus:border-primary/50 transition-all rounded-xl h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Confirm New Password</label>
                <div className="relative group">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="••••••••" 
                    className="pl-10 pr-10 bg-muted/30 border-border/40 focus:border-primary/50 transition-all rounded-xl h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isChangingPassword}
                variant="outline"
                className="mt-2 border-border/40 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50 font-bold rounded-xl h-12 active:scale-[0.98] transition-all"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                    RE-HASHING CREDENTIALS...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="mr-2 h-4 w-4" />
                    CHANGE PASSWORD
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
