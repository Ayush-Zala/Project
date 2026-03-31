"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"

/**
 * useHasPermission Hook
 * ─────────────────────────────────────────────────────────────
 * Frontend utility to check if the current user has a specific 
 * permission.  Since permissions are not in the session by default, 
 * this hook fetches them from the server and caches them during 
 * the session lifespan.
 * ─────────────────────────────────────────────────────────────
 */
export function useHasPermission(permissionSlug: string) {
  const { data: session } = authClient.useSession()
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    async function check() {
      if (!session?.user) {
        setHasAccess(false)
        return
      }

      try {
        // We call a lightweight check API or just fetch all permissions once.
        // For efficiency, we'll fetch 'my permissions' once and store in a ref/context.
        // For now, let's just do a fetch-per-check (simple implementation).
        const res = await fetch(`/api/auth/check-permission?slug=${permissionSlug}`)
        const data = await res.json()
        setHasAccess(data.allowed)
      } catch {
        setHasAccess(false)
      }
    }

    if (session) check()
  }, [session, permissionSlug])

  return hasAccess
}
