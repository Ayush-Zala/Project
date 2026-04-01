"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserCircleIcon,
  KeyIcon,
  LibraryIcon
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Roles",
      url: "/dashboard/roles",
      icon: <ShieldCheckIcon />,
      permission: "roles:read",
    },
    {
      title: "Permissions",
      url: "/dashboard/permissions",
      icon: <KeyIcon />,
      permission: "permissions:read",
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
      title: "Profile",
      url: "/dashboard/profile",
      icon: <UserCircleIcon />,
    },
  ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <a href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-primary">Obsidian Noir</span>
                    <span className="truncate text-xs text-muted-foreground">Premium Dashboard</span>
                  </div>
                </a>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroupLabel>Application</SidebarGroupLabel>
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
