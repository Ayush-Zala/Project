
"use client"

import * as React from "react"
import {
  LibraryIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChevronLeftIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import Link from "next/link"
import { TeamRolesTab } from "@/components/teams/team-roles-tab"
import { TeamMembersTab } from "@/components/teams/team-members-tab"
import { authClient } from "@/lib/auth-client"
import { usePermissions } from "@/providers/permission-provider"
import { AddMemberDialog } from "@/components/teams/add-member-dialog"
import { TeamRoleDialog } from "@/components/teams/team-role-dialog"

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idStr } = React.use(params)
  const [team, setTeam] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("members")

  // Creation dialog states
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false)
  const [isAddRoleOpen, setIsAddRoleOpen] = React.useState(false)

  const { data: session } = authClient.useSession()
  const { hasPermission: useHasPermission, isLoading: permissionsLoading } = usePermissions()

  const fetchTeam = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/teams/${idStr}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTeam(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load team details")
    } finally {
      setIsLoading(false)
    }
  }, [idStr])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("TEAMS_CHANGED", React.useCallback((data: any) => {
    if (String(data.teamId) === idStr) fetchTeam()
  }, [idStr, fetchTeam]))

  React.useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  // 🛡️ Dynamic UI: Permission-aware tab visibility
  const canReadMembers = useHasPermission("team_members:read");
  const canReadRoles = useHasPermission("team_roles:read");
  const canCreateMember = useHasPermission("team_members:create");
  const canCreateRole = useHasPermission("team_roles:create");

  // Auto-select first available tab if activeTab is hidden
  React.useEffect(() => {
    if (!canReadMembers && activeTab === "members" && canReadRoles) {
      setActiveTab("roles");
    } else if (!canReadRoles && activeTab === "roles" && canReadMembers) {
      setActiveTab("members");
    }
  }, [canReadMembers, canReadRoles, activeTab]);

  if ((isLoading && !team) || permissionsLoading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
        </header>

        <div className="flex flex-col gap-4 px-4 md:px-8 py-4 w-full animate-pulse">
          {/* Header Card Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 md:p-6 rounded-2xl border border-input">
            <div className="flex items-start gap-4">
              <Skeleton className="hidden sm:block h-12 w-12 rounded-xl" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64 max-w-full rounded" />
                <div className="flex items-center gap-3 mt-1">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          {/* Tabs & Table Skeleton */}
          <div className="w-full space-y-6">
            <Skeleton className="h-12 w-64 rounded-xl" />

            {/* Table Skeleton mimicking Image 1 */}
            <div className="bg-background/40 border border-input rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
              <div className="bg-muted/30 border-b border-input py-4 px-6 flex gap-8">
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded ml-auto" />
              </div>
              <div className="flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-6 border-b border-input/40">
                    <Skeleton className="h-6 w-[80px] rounded-[6px] opacity-70 shrink-0" />
                    <Skeleton className="h-6 w-5/12 rounded-[6px] opacity-70" />
                    <Skeleton className="h-6 w-3/12 rounded-[6px] opacity-70" />
                    <Skeleton className="h-6 w-8 ml-auto rounded-[6px] opacity-70 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!team) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <LibraryIcon className="h-12 w-12 text-muted-foreground/20" />
        <h2 className="text-xl font-bold">Team Not Found</h2>
        <Button variant="outline" asChild>
          <Link href="/dashboard/teams">Back to Registry</Link>
        </Button>
      </div>
    )
  }

  if (!session) return null

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-background/80 backdrop-blur-md sticky top-0 z-50 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/teams">Teams</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{team.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchTeam} className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95">
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {activeTab === "members" && canCreateMember && team.isActive && (
            <Button
              onClick={() => setIsAddMemberOpen(true)}
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <UserPlusIcon className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add Member</span>
            </Button>
          )}
          {activeTab === "roles" && canCreateRole && team.isActive && (
            <Button
              onClick={() => setIsAddRoleOpen(true)}
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add Role</span>
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 px-4 md:px-8 py-4 w-full">
        {/* Team Identification Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 md:p-6 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-32 -mt-32" />

          <div className="flex items-start gap-4 relative z-10">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <LibraryIcon className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{team.name}</h1>
                <Badge variant={team.isActive ? "default" : "secondary"} className={`uppercase text-[8px] font-black tracking-widest px-1.5 py-0.5 ${team.isActive ? 'bg-primary/10 text-primary border-primary/20' : 'opacity-50'}`}>
                  {team.isActive ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs max-w-2xl leading-normal line-clamp-1">
                {team.description || "Authorized organizational unit for policy enforcement."}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">
                  <UsersIcon className="h-3 w-3" />
                  {team._count?.members || 0} Members
                </div>
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">
                  <ShieldCheckIcon className="h-3 w-3" />
                  {team._count?.roles || 0} Roles
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
            {/* Integrated Tabs Navigation */}
            {(canReadMembers || canReadRoles) && (
              <div className="hidden lg:flex items-center gap-1.5 bg-background/20 border border-border/10 p-1 rounded-xl backdrop-blur-sm shadow-inner overflow-hidden">
                {canReadMembers && (
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`rounded-lg flex items-center gap-2 px-4 py-1.5 transition-all font-bold tracking-tight relative group z-10 text-[11px] uppercase ${activeTab === "members" ? "text-zinc-50 dark:text-zinc-950" : "text-muted-foreground/60 hover:text-foreground"}`}
                  >
                    <UsersIcon className="h-3.5 w-3.5" />
                    Members
                    {activeTab === "members" && (
                      <motion.div
                        layoutId="active-header-tab-bg"
                        className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 rounded-lg -z-10 shadow-lg"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                )}
                {canReadRoles && (
                  <button
                    onClick={() => setActiveTab("roles")}
                    className={`rounded-lg flex items-center gap-2 px-4 py-1.5 transition-all font-bold tracking-tight relative group z-10 text-[11px] uppercase ${activeTab === "roles" ? "text-zinc-50 dark:text-zinc-950" : "text-muted-foreground/60 hover:text-foreground"}`}
                  >
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    Roles
                    {activeTab === "roles" && (
                      <motion.div
                        layoutId="active-header-tab-bg"
                        className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 rounded-lg -z-10 shadow-lg"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" className="h-8 rounded-xl flex gap-2 border-border/40 hover:bg-muted/50 text-[11px] font-bold uppercase tracking-wider" asChild>
              <Link href="/dashboard/teams">
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {/* Tab Content Area */}
        {(canReadMembers || canReadRoles) ? (
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === "members" && canReadMembers && (
                <motion.div
                  key="members-pane"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TeamMembersTab teamId={idStr} isActive={team.isActive} />
                </motion.div>
              )}
              {activeTab === "roles" && canReadRoles && (
                <motion.div
                  key="roles-pane"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TeamRolesTab teamId={idStr} isActive={team.isActive} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/60">
            <ShieldCheckIcon className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold">Limited Visibility</h3>
            <p className="text-sm text-muted-foreground">You do not have the required capabilities to manage this team's segments.</p>
          </div>
        )}
      </div>

      <AddMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        teamId={idStr}
        onSuccess={() => { }} // Tab will auto-refresh via WebSocket
      />

      <TeamRoleDialog
        open={isAddRoleOpen}
        onOpenChange={setIsAddRoleOpen}
        teamId={idStr}
        role={null}
        onSuccess={() => { }} // Tab will auto-refresh via WebSocket
      />
    </>
  )
}
