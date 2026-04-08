"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  Plus,
  Building2,
  Check,
  Settings,
  ShieldCheck,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
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

export function OrgSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: organisations, isPending } = authClient.useListOrganizations()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: activeMember } = authClient.useActiveMember()

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("ORGANISATIONS_CHANGED", React.useCallback(() => {
    router.refresh()
  }, [router]))

  const [open, setOpen] = React.useState(false)

  const handleSwitch = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId })
      toast.success(`Switched to ${organisations?.find(o => o.id === orgId)?.name}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to switch organisation")
    }
  }

  const active = organisations?.find((org) => org.id === activeOrg?.id) || organisations?.[0]

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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
                  <span className="truncate text-xs text-muted-foreground uppercase tracking-wider font-bold">
                    {activeMember?.role || "Workspace"}
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
                Available Organisations
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
                      onClick={() => handleSwitch(String(org.id))}
                      className="gap-2 p-2 hover:bg-primary/10 transition-colors duration-200"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border border-sidebar-border">
                        {org.logo ? (
                          <img src={org.logo} alt={org.name} className="size-4 rounded-sm object-cover" />
                        ) : (
                          <Building2 className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium text-sidebar-foreground">{org.name}</span>
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
