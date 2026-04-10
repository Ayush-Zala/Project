"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  Plus,
  Building2,
  Check,
  Settings,
  ShieldCheck,
  ExternalLink,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useSocket } from "@/providers/socket-provider"
import { useWorkspace } from "@/hooks/use-workspace"
import { apiClient } from "@/lib/api-client"
import { usePermissions } from "@/providers/permission-provider"

export function OrgSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()

  // 🛡️ Use our unified Workspace Hook instead of standard Better Auth hooks
  const { data: activeOrg, isExternal, refresh: refreshWorkspace } = useWorkspace()
  const { hasPermission } = usePermissions()
  const canReadAll = hasPermission("organisation:read_all")
  const { data: activeMember } = authClient.useActiveMember()

  const [organisations, setOrganisations] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchOrganisations = React.useCallback(async () => {
    try {
      // Use our hardened API which handles status filtering and Super Admin bypass
      const response = await fetch("/api/organisations?per_page=100")
      if (response.ok) {
        const data = await response.json()
        setOrganisations(data.organisations || [])
      }
    } catch (error) {
      console.error("Failed to fetch organisations", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOrganisations()
  }, [fetchOrganisations])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()

  const handleRefresh = React.useCallback(() => {
    fetchOrganisations()
    refreshWorkspace()
  }, [fetchOrganisations, refreshWorkspace])

  useEvent("ORGANISATIONS_CHANGED", handleRefresh)
  useEvent("ORGANISATION_MEMBERS_CHANGED", handleRefresh)

  const [open, setOpen] = React.useState(false)

  const handleSwitch = async (org: any) => {
    const toastId = toast.loading(`Switching to ${org.name}...`)
    try {
      if (canReadAll && !org.isMember) {
        // 🚀 Professional Path: Use God Switch for external organizations
        await apiClient(`/api/organisations/${org.id}/god-switch`, { method: "POST" })
        toast.success(`Switched to ${org.name}`, { id: toastId })
      } else {
        // Standard Switch for members
        await authClient.organization.setActive({ organizationId: String(org.id) })
        toast.success(`Switched to ${org.name}`, { id: toastId })
      }

      await refreshWorkspace()
      router.refresh()
      // Force a full layout effect sync
      window.dispatchEvent(new Event("ORG_MODULE_REFRESH"))
    } catch (error: any) {
      toast.error(error.message || "Failed to switch organisation", { id: toastId })
    }
  }

  // Determine which organization is currently "active" in the UI
  const active = activeOrg || organisations?.find((org) => String(org.id) === String(activeOrg?.id)) || organisations?.[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground relative">
                  {active?.logo ? (
                    <img src={active.logo} alt={active.name} className="size-5 rounded-sm object-cover" />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-primary">
                    {active?.name || "Select Organisation"}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                    {isExternal ? (
                      "External"
                    ) : (
                      activeMember?.role || activeOrg?.myRole || "Workspace"
                    )}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-sidebar border-sidebar-border"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-bold uppercase tracking-widest px-2 py-1.5">
                {canReadAll ? "All Organisations" : "Available Organisations"}
              </DropdownMenuLabel>
              <AnimatePresence mode="popLayout">
                {organisations?.map((org, index) => (
                  <motion.div
                    key={org.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DropdownMenuItem
                      onClick={() => handleSwitch(org)}
                      className="gap-2 p-2 hover:bg-primary/10 transition-colors duration-200"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border border-sidebar-border relative">
                        {org.logo ? (
                          <img src={org.logo} alt={org.name} className="size-4 rounded-sm object-cover" />
                        ) : (
                          <Building2 className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sidebar-foreground">{org.name}</span>
                        {org.isMember ? (
                          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter -mt-0.5">{org.myRole || "Member"}</span>
                        ) : (
                          canReadAll && (
                            <span className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter -mt-0.5">External</span>
                          )
                        )}
                      </div>
                      {active?.id === org.id && (
                        <Check className="ml-auto size-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 focus:bg-primary/5 cursor-pointer group"
              onClick={() => router.push("/dashboard/organisation")}
            >
              <div className="flex size-6 items-center justify-center rounded-md border border-dashed border-sidebar-border group-hover:border-primary group-hover:bg-primary/10 transition-all duration-300">
                <Plus className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="font-bold text-muted-foreground group-hover:text-primary transition-colors">Setup New Organisation</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 focus:bg-primary/5 cursor-pointer"
              onClick={() => router.push("/dashboard/organisation/settings")}
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-muted/50 group-hover:bg-primary/10">
                <Settings className="size-4 text-muted-foreground" />
              </div>
              <div className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Workspace Settings</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
