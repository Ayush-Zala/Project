"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserCircleIcon,
  KeyIcon,
  LibraryIcon,
  HistoryIcon,
  Building2,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Permissions",
      url: "/dashboard/permissions",
      icon: <KeyIcon />,
      permission: "permissions:read",
    },
    {
      title: "Roles",
      url: "/dashboard/roles",
      icon: <ShieldCheckIcon />,
      permission: "roles:read",
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: <UsersIcon />,
      permission: "users:read",
    },
    {
      title: "Teams",
      url: "/dashboard/teams",
      icon: <LibraryIcon />,
      permission: "teams:read",
    },
    {
      title: "Organization",
      url: "/dashboard/organisation",
      icon: <Building2 />,
      permission: "organisation:read",
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: <UserCircleIcon />,
    },
    {
      title: "Audit Logs",
      url: "/dashboard/audit-logs",
      icon: <HistoryIcon />,
      permission: "audit:read",
    },
  ],
}

import { OrgSwitcher } from "@/components/organization/org-switcher"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
