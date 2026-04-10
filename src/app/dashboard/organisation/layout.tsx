"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Building2 } from "lucide-react"
import { OrgTabs } from "@/components/organization/org-tabs"
import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

import {
  RefreshCwIcon,
  Plus,
  MailPlus,
  FolderPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useHasPermission } from "@/hooks/use-has-permission"
import { OrganisationDialog } from "@/components/organization/organisation-dialog"
import { MemberDialog } from "@/components/organization/member-dialog"
import { TeamDialog } from "@/components/organization/team-dialog"
import { useWorkspace } from "@/hooks/use-workspace"

export default function OrganisationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 🛡️ Use unified Workspace Hook instead of standard Better Auth
  const { data: activeOrg, isExternal } = useWorkspace()

  // 1. Dialog State Manifest
  const [isOrgOpen, setIsOrgOpen] = React.useState(false)
  const [isMemberOpen, setIsMemberOpen] = React.useState(false)
  const [isTeamOpen, setIsTeamOpen] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // 2. Breadcrumb Orchestration
  const breadcrumbs = React.useMemo(() => {
    const base = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Organization", href: "/dashboard/organisation" }
    ]
    if (pathname.includes("members")) return [...base, { label: "Members" }]
    if (pathname.includes("teams")) return [...base, { label: "Teams" }]
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "Organisations" }]
  }, [pathname])

  const isRegistry = pathname === "/dashboard/organisation"
  const isTeamMembersPath = pathname.includes("/teams/") && pathname.includes("/members")

  // 3. Global Refresh Trigger
  const handleRefresh = () => {
    setIsRefreshing(true)
    // Emit a custom event that pages can listen to if needed, 
    // though most auto-sync via WebSocket.
    window.dispatchEvent(new CustomEvent("ORG_MODULE_REFRESH"))
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!isTeamMembersPath && (
        <DashboardHeader breadcrumbs={breadcrumbs}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {isRegistry ? (
            useHasPermission("organisation:create") && (
              <Button
                onClick={() => setIsOrgOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-lg shadow-primary/20 h-8 px-8"
              >
                Add Organization
              </Button>
            )
          ) : pathname.includes("members") ? (
            useHasPermission("organisation_member:create") && (
              <Button
                onClick={() => setIsMemberOpen(true)}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 font-black uppercase tracking-widest text-[10px] px-8"
              >
                Add Member
              </Button>
            )
          ) : pathname.includes("teams") && (
            useHasPermission("organisation_team:create") && (
              <Button
                onClick={() => setIsTeamOpen(true)}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 font-black uppercase tracking-widest text-[10px] px-8"
              >
                Add Team
              </Button>
            )
          )}
        </DashboardHeader>
      )}

      {!isTeamMembersPath ? (
        <PageShell>
          {/* Secondary Tier: Organization Hub Header */}
          {!isRegistry && !isTeamMembersPath && activeOrg && (
            <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                <Building2 className="size-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-tight text-foreground line-clamp-1">{activeOrg.name}</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
                  {pathname.includes("members") ? "Organization Members" : "Organization Teams"}
                </p>
              </div>
              <div className="ml-auto">
                <OrgTabs />
              </div>
            </div>
          )}

          {/* Base Tier: Component Content */}
          <div className="flex-1 w-full text-foreground">
            {children}
          </div>
        </PageShell>
      ) : (
        <div className="flex-1 w-full h-full text-foreground text-foreground">
          {children}
        </div>
      )}

      {/* Persistent Dialog Infrastructure */}
      <OrganisationDialog open={isOrgOpen} onOpenChange={setIsOrgOpen} organisation={null} onSuccess={() => { }} />
      {activeOrg && (
        <>
          <MemberDialog
            open={isMemberOpen}
            onOpenChange={setIsMemberOpen}
            organizationId={activeOrg.id.toString()}
            member={null}
            onSuccess={() => { }}
          />
          <TeamDialog
            open={isTeamOpen}
            onOpenChange={setIsTeamOpen}
            organizationId={activeOrg.id.toString()}
            team={null}
            onSuccess={() => { }}
          />
        </>
      )}
    </div>
  )
}
