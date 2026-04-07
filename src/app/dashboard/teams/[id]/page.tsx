
"use client"

import * as React from "react"
import {
  LibraryIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChevronLeftIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs"
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

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idStr } = React.use(params)
  const [team, setTeam] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("members")

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

        <div className="flex flex-col gap-8 px-4 md:px-8 py-8 w-full animate-pulse">
          {/* Header Card Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-muted/20 p-6 md:p-10 rounded-2xl border border-input">
            <div className="flex items-start gap-6">
               <Skeleton className="hidden sm:block h-16 w-16 rounded-2xl" />
               <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-96 max-w-full rounded" />
                  <div className="flex items-center gap-4 mt-1">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
               </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
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
      </header>

      <div className="flex flex-col gap-8 px-4 md:px-8 py-8 w-full">
        {/* Team Identification Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-muted/20 p-6 md:p-10 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-32 -mt-32" />
          
          <div className="flex items-start gap-6 relative z-10">
             <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <LibraryIcon className="h-8 w-8" />
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                   <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{team.name}</h1>
                   <Badge variant={team.isActive ? "default" : "secondary"} className={`uppercase text-[9px] font-black tracking-widest px-2 py-0.5 ${team.isActive ? 'bg-primary/10 text-primary border-primary/20' : 'opacity-50'}`}>
                      {team.isActive ? 'Active Segment' : 'Suspended'}
                   </Badge>
                </div>
                <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                   {team.description || "Authorized organizational unit for hierarchical policy enforcement."}
                </p>
                <div className="flex items-center gap-4 mt-2">
                   <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                      <UsersIcon className="h-3 w-3" />
                      {team._count?.members || 0} Members
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                      <ShieldCheckIcon className="h-3 w-3" />
                      {team._count?.roles || 0} Roles
                   </div>
                </div>
             </div>
          </div>

          <div className="relative z-10">
             <Button variant="outline" className="rounded-xl flex gap-2 border-border/40 hover:bg-muted/50" asChild>
                <Link href="/dashboard/teams">
                   <ArrowLeftIcon className="h-4 w-4" />
                   Back to Registry
                </Link>
             </Button>
          </div>
        </div>

        {/* Tabbed Management Interface */}
        {(canReadMembers || canReadRoles) ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-xl w-full sm:w-auto flex overflow-x-auto no-scrollbar">
              {canReadMembers && (
                <TabsTrigger value="members" className="rounded-lg flex gap-2 px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <UsersIcon className="h-4 w-4" />
                  Members
                </TabsTrigger>
              )}
              {canReadRoles && (
                <TabsTrigger value="roles" className="rounded-lg flex gap-2 px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Roles
                </TabsTrigger>
              )}
            </TabsList>

            {canReadMembers && (
              <TabsContent value="members" className="mt-0 focus-visible:outline-none">
                <TeamMembersTab teamId={idStr} isActive={team.isActive} />
              </TabsContent>
            )}

            {canReadRoles && (
              <TabsContent value="roles" className="mt-0 focus-visible:outline-none">
                <TeamRolesTab teamId={idStr} isActive={team.isActive} />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/60">
             <ShieldCheckIcon className="h-12 w-12 text-muted-foreground/20 mb-4" />
             <h3 className="text-lg font-bold">Limited Visibility</h3>
             <p className="text-sm text-muted-foreground">You do not have the required capabilities to manage this team's segments.</p>
          </div>
        )}
      </div>
    </>
  )
}
