"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { usePermissions } from "@/providers/permission-provider"

interface WorkspaceContextType {
  data: any | null
  isLoading: boolean
  isExternal: boolean
  refresh: () => Promise<void>
  clearOverride: () => void
}

const WorkspaceContext = React.createContext<WorkspaceContextType>({
  data: null,
  isLoading: true,
  isExternal: false,
  refresh: async () => {},
  clearOverride: () => {},
})

/**
 * WorkspaceProvider
 * ─────────────────────────────────────────────────────────────
 * Centralized source of truth for workspace resolution.
 * Handles both Better Auth member states and Super Admin Ghost Access.
 * This provider eliminates race conditions between sidebar and page.
 * ─────────────────────────────────────────────────────────────
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: activeOrg, isPending: isBetterAuthPending } = authClient.useActiveOrganization()
  const { isSuperAdmin, isLoading: isPermsLoading } = usePermissions()
  
  const [ghostOrg, setGhostOrg] = React.useState<any>(null)
  const [isGhostLoading, setIsGhostLoading] = React.useState(false)
  const [hasResolvedGhost, setHasResolvedGhost] = React.useState(false)

  const fetchActiveOrgFallback = React.useCallback(async () => {
    // 🛡️ Logic: If the user is a Super Admin, we always consult our custom 
    // active-workspace API. This avoids the 400 errors triggered by Better Auth
    // when a non-member Super Admin 'ghosts' into an organization.
    if (!isSuperAdmin) {
        setGhostOrg(null)
        setHasResolvedGhost(true)
        return
    }

    setIsGhostLoading(true)
    try {
      const data = await apiClient("/api/organisations/active")
      if (data.activeOrg) {
        setGhostOrg(data.activeOrg)
      } else {
        setGhostOrg(null)
      }
    } catch (error) {
      console.error("Ghost Resolver failed:", error)
      setGhostOrg(null)
    } finally {
      setIsGhostLoading(false)
      setHasResolvedGhost(true)
    }
  }, [isSuperAdmin])

  React.useEffect(() => {
    if (!isPermsLoading) {
        fetchActiveOrgFallback()
    }
  }, [fetchActiveOrgFallback, isPermsLoading])

  // combined refresh
  const refresh = React.useCallback(async () => {
      await fetchActiveOrgFallback()
  }, [fetchActiveOrgFallback])

  const clearOverride = React.useCallback(() => {
    console.log("[WORKSPACE] Explicitly clearing administrative override.");
    setGhostOrg(null);
  }, []);

  // Combined State
  // 🚀 For Super Admins, we PRIORITIZE ghostOrg (our custom resolver) 
  const data = isSuperAdmin ? (ghostOrg || activeOrg) : activeOrg
  
  // 🛡️ Loading State Hardening
  const isLoading = isPermsLoading || (!hasResolvedGhost && isSuperAdmin) || isGhostLoading || (isSuperAdmin ? false : isBetterAuthPending)
  
  const isExternal = !!(ghostOrg && ghostOrg.isExternal)

  const value = React.useMemo(() => ({
    data,
    isLoading,
    isExternal,
    refresh,
    clearOverride
  }), [data, isLoading, isExternal, refresh, clearOverride])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspaceContext = () => React.useContext(WorkspaceContext)
