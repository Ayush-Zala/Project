"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  UserCircleIcon,
  MailIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  BriefcaseIcon,
  Building2Icon,
  ClockIcon
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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

// ── Industrial Validation Schemas ────────────────────────────────
const profileSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Security protocol requires at least 8 characters")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one numeric digit")
    .regex(/[^A-Za-z0-9]/, "Must include at least one special character (@$!%*?&)"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Security mismatch: Passwords do not match",
  path: ["confirmPassword"],
})

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("personal")

  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || ".."
  }

  const formatJoinedDate = (timestamp: string) => {
    if (!timestamp) return "Unknown"
    const date = new Date(Number(timestamp))
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "long" })
    const year = date.getFullYear()

    const getDaySuffix = (d: number) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1: return "st"
        case 2: return "nd"
        case 3: return "rd"
        default: return "th"
      }
    }

    return `${month} ${day}${getDaySuffix(day)}, ${year}`
  }

  // 1. Identity Form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
  })

  // 2. Security Form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/users/profile")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProfile(data)
      profileForm.reset({ name: data.name })
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }, [profileForm])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsUpdatingProfile(true)
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setProfile((prev: any) => ({ ...prev, name: data.user.name }))
      toast.success("Profile Updated")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsChangingPassword(true)
    try {
      const res = await fetch("/api/users/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success("Password Updated")
      passwordForm.reset()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
        </header>

        <div className="flex flex-col gap-12 p-4 md:p-8 w-full max-w-screen-2xl mx-auto animate-pulse">
          <div className="noir-card p-8 md:p-12 relative overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 w-full">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">
                <Skeleton className="h-28 w-28 md:h-36 md:w-36 rounded-full shrink-0" />
                <div className="flex flex-col items-center md:items-start gap-4">
                  <Skeleton className="h-10 md:h-14 w-[250px] md:w-[400px] rounded-xl" />
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 mt-2">
                    <Skeleton className="h-5 w-48 rounded" />
                    <Skeleton className="h-5 w-40 rounded" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-12 w-32 rounded-xl shrink-0 hidden md:block" />
            </div>
          </div>
          
          <div className="space-y-8">
             <div className="flex gap-2 p-1.5 border border-input rounded-xl w-fit">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
             </div>
             <div className="max-w-3xl noir-card p-6 space-y-6">
                <Skeleton className="h-6 w-48 rounded" />
                <div className="space-y-3 pt-4">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
             </div>
          </div>
        </div>
      </>
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
                <BreadcrumbPage>Profile Identity</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-12 p-4 md:p-8 w-full max-w-screen-2xl mx-auto transition-all duration-500">

        {/* Modern Profile Header */}
        <div className="noir-card p-8 md:p-12 relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 w-full">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="relative">
                <Avatar className="h-28 w-28 md:h-36 md:w-36 aspect-square border-2 border-primary/20 shadow-none ring-4 ring-primary/5 rounded-full overflow-hidden">
                  <AvatarImage src={profile?.image} className="rounded-full object-cover" />
                  <AvatarFallback className="bg-muted text-primary text-3xl font-black rounded-full flex items-center justify-center">{getInitials(profile?.name)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 p-2 bg-background border border-border shadow-sm rounded-full">
                  <ShieldCheckIcon className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex flex-col items-center md:items-start gap-6">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <h1 className="text-3xl md:text-6xl font-black tracking-tight uppercase text-foreground leading-none">{profile?.name}</h1>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[0.7rem] px-3 py-1 rounded-md">
                    {profile?.role || "Global Member"}
                  </Badge>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 mt-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    <MailIcon className="h-4 w-4 text-primary/40" />
                    {profile?.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    <CalendarIcon className="h-4 w-4 text-primary/40" />
                    JOINED {formatJoinedDate(profile?.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant={isEditMode ? "destructive" : "default"}
              onClick={() => {
                if (isEditMode) {
                  // Revert to original identity manifest
                  profileForm.reset({ name: profile?.name })
                  passwordForm.reset({ 
                    currentPassword: "", 
                    newPassword: "", 
                    confirmPassword: "" 
                  })
                }
                setIsEditMode(!isEditMode)
              }}
              className="px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[0.7rem] transition-all active:scale-[0.98] shadow-none"
            >
              {isEditMode ? "Cancel Edit" : "Edit Profile"}
            </Button>
          </div>
        </div>

        {/* Tabbed Configuration Manifest */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-secondary/50 dark:bg-zinc-950/40 p-1.5 rounded-xl h-auto flex flex-wrap gap-1.5 border border-border/40 self-start backdrop-blur-xl relative">
            <TabsTrigger 
              value="personal" 
              className="px-6 py-2.5 rounded-lg font-black uppercase tracking-[0.15em] text-[0.7rem] relative z-10 transition-colors duration-300 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground"
            >
              {activeTab === "personal" && (
                <motion.div
                  layoutId="active-tab-highlight"
                  className="absolute inset-0 bg-background dark:bg-zinc-800 rounded-lg -z-10 shadow-md"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <UserCircleIcon className="h-4 w-4 mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="px-6 py-2.5 rounded-lg font-black uppercase tracking-[0.15em] text-[0.7rem] relative z-10 transition-colors duration-300 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground"
            >
              {activeTab === "security" && (
                <motion.div
                  layoutId="active-tab-highlight"
                  className="absolute inset-0 bg-background dark:bg-zinc-800 rounded-lg -z-10 shadow-md"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <KeyIcon className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-8 outline-none">
            <div className="max-w-3xl">
              <div className="noir-card">
                <div className="p-6 border-b border">
                  <span className="font-black uppercase tracking-[0.2em] text-[0.8rem] text-primary">Personal Information</span>
                </div>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="p-4 space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[0.75rem] font-black text-foreground uppercase tracking-widest ml-1">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <UserCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300" />
                              <Input
                                {...field}
                                disabled={!isEditMode}
                                placeholder="Enter your command identity..."
                                className="pl-12 bg-background border border-input focus:border-primary transition-all rounded-xl h-14 text-[1rem] font-bold text-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[0.7rem] font-bold text-red-500 ml-1" />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormLabel className="text-[0.75rem] font-black text-foreground uppercase tracking-widest ml-1">Email Address</FormLabel>
                      <div className="relative group">
                        <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          value={profile?.email}
                          disabled
                          className="pl-12 bg-background border border-input cursor-not-allowed rounded-xl h-14 text-[1rem] font-bold text-foreground disabled:opacity-100"
                        />
                        <Badge variant="outline" className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.6rem] uppercase tracking-widest bg-primary/10 text-primary border-none">
                          Verified
                        </Badge>
                      </div>
                    </div>

                    {isEditMode && (
                      <Button
                        type="submit"
                        disabled={isUpdatingProfile || !profileForm.formState.isDirty}
                        className="w-full md:w-auto px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] rounded-xl h-14 transition-all active:scale-[0.98] flex gap-3 text-[0.8rem] shadow-none animate-in fade-in zoom-in-95 duration-300"
                      >
                        {isUpdatingProfile ? (
                          <><RefreshCwIcon className="h-4 w-4 animate-spin" /> SAVING</>
                        ) : (
                          <span> SAVE CHANGES </span>
                        )}
                      </Button>
                    )}
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-8 outline-none">
            <div className="noir-card lg:max-w-3xl">
              <div className="p-6 border-b border flex items-center justify-between">

                <span className="font-black uppercase tracking-[0.2em] text-[0.8rem] text-primary">Security Credentials</span>

              </div>

              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="p-4 space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[0.75rem] font-black text-foreground uppercase tracking-widest ml-1">Current Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300" />
                            <Input
                              type={showCurrent ? "text" : "password"}
                              {...field}
                              disabled={!isEditMode}
                              placeholder="••••••••"
                              className="pl-12 pr-12 bg-background border border-input focus:border-primary transition-all rounded-xl h-14 text-[1rem] font-bold text-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrent(!showCurrent)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                            >
                              {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[0.7rem] font-bold text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[0.75rem] font-black text-foreground uppercase tracking-widest ml-1">New Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300" />
                              <Input
                                type={showNew ? "text" : "password"}
                                {...field}
                                disabled={!isEditMode}
                                placeholder="••••••••"
                                className="pl-12 pr-12 bg-background border border-input focus:border-primary transition-all rounded-xl h-14 text-[1rem] font-bold text-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                              >
                                {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[0.7rem] font-bold text-red-500 ml-1" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[0.75rem] font-black text-foreground uppercase tracking-widest ml-1">Confirm Identity</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300" />
                              <Input
                                type={showConfirm ? "text" : "password"}
                                {...field}
                                disabled={!isEditMode}
                                placeholder="••••••••"
                                className="pl-12 pr-12 bg-background border border-input focus:border-primary transition-all rounded-xl h-14 text-[1rem] font-bold text-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                              >
                                {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[0.7rem] font-bold text-red-500 ml-1" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isEditMode && (
                      <Button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full md:w-auto px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] rounded-xl h-14 transition-all active:scale-[0.98] flex gap-3 text-[0.8rem] shadow-none animate-in fade-in zoom-in-95 duration-300"
                      >
                        {isChangingPassword ? (
                          <><RefreshCwIcon className="h-4 w-4 animate-spin" /> UPDATING</>
                        ) : (
                          <span>SAVE CREDENTIALS</span>
                        )}
                      </Button>
                  )}
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
