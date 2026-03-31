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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [mounted, setMounted] = React.useState(false)
  const { useEvent } = useSocket()


  useEvent("USERS_CHANGED", React.useCallback((data: any) => {
    if (String(data.userId) === String(session?.user?.id) && data.action === "profile_updated") {
      refetch()
    }
  }, [session?.user?.id, refetch]))

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Loading state
  if (isPending || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-8 rounded-lg border-2 border-primary border-t-transparent"
        />
      </div>
    )
  }

  // Not authenticated: proxy middleware will redirect
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
