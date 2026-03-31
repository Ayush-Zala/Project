"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useTheme } from "next-themes"
import { usePermissions } from "@/providers/permission-provider"
import { ChevronsUpDownIcon, BellIcon, LogOutIcon, SunIcon, MoonIcon, LaptopIcon } from "lucide-react"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { roles } = usePermissions()

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login")
        },
      },
    })
  }

  const { setTheme, theme } = useTheme()
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "UN"

  const roleLabel = roles.length > 0 ? roles.join(", ") : "User"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {roleLabel}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <div className="px-2 py-1.5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Active Designations</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.length > 0 ? roles.map(r => (
                    <div key={r} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 ring-1 ring-primary/20">
                      {r}
                    </div>
                  )) : (
                    <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider italic">
                      No roles assigned
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <SunIcon className={`mr-2 h-4 w-4 ${theme === 'light' ? 'text-primary' : ''}`} />
                Light
                {theme === 'light' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <MoonIcon className={`mr-2 h-4 w-4 ${theme === 'dark' ? 'text-primary' : ''}`} />
                Dark
                {theme === 'dark' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <LaptopIcon className={`mr-2 h-4 w-4 ${theme === 'system' ? 'text-primary' : ''}`} />
                System
                {theme === 'system' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BellIcon className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer group">
              <LogOutIcon className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
