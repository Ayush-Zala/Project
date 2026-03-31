"use client"

/**
 * dashboard/layout.tsx
 * ─────────────────────────────────────────────────────────────
 * Shared layout for ALL dashboard sub-routes.
 * This provides the sidebar + main wrapper automatically to:
 *   /dashboard
 *   /dashboard/roles
 *   /dashboard/users  (future)
 *   … etc.
 *
 * Each child page only needs to render its own content area.
 * ─────────────────────────────────────────────────────────────
 */

import React from "react"
import { authClient } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { motion } from "framer-motion"
import { useSocket } from "@/providers/socket-provider"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/providers/permission-provider"
import { ModuleGuard } from "@/components/guards/module-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [mounted, setMounted] = React.useState(false)
  const { useEvent } = useSocket()
  const router = useRouter()
  const { isLoading: permissionsLoading } = usePermissions()

  useEvent("USERS_CHANGED", React.useCallback((data: any) => {
    if (String(data.userId) === String(session?.user?.id) && data.action === "profile_updated") {
      refetch()
    }
  }, [session?.user?.id, refetch]))

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = isPending || !mounted || permissionsLoading

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <div className="h-8 w-8 rounded-lg border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) return null

  const user = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || "",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <ModuleGuard>
          {children}
        </ModuleGuard>
      </SidebarInset>
    </SidebarProvider>
  )
}
