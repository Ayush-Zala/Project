"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { useSocket } from "@/providers/socket-provider"

interface PermissionContextType {
  permissions: string[]
  isSuperAdmin: boolean
  isLoading: boolean
  hasPermission: (slug: string) => boolean
  refresh: () => Promise<void>
}

const PermissionContext = React.createContext<PermissionContextType>({
  permissions: [],
  isSuperAdmin: false,
  isLoading: true,
  hasPermission: () => false,
  refresh: async () => {},
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession()
  const [state, setState] = React.useState<{
    permissions: string[]
    isSuperAdmin: boolean
    isLoading: boolean
  }>({
    permissions: [],
    isSuperAdmin: false,
    isLoading: true,
  })
  
  const fetchPermissions = React.useCallback(async () => {
    if (!session?.user) {
      if (!state.isLoading) return; // Already stopped loading
      setState({ permissions: [], isSuperAdmin: false, isLoading: false })
      return
    }

    try {
      const res = await fetch("/api/auth/me/permissions")
      const data = await res.json()
      setState({
        permissions: data.permissions || [],
        isSuperAdmin: data.isSuperAdmin || false,
        isLoading: false
      })
    } catch (error) {
      console.error("Failed to fetch user permissions manifest", error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [session?.user])

  React.useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Real-time synchronization
  const { useEvent } = useSocket()
  
  // Refresh when permissions or roles change
  useEvent("PERMISSIONS_CHANGED", fetchPermissions)
  useEvent("ROLE_PERMISSIONS_CHANGED", fetchPermissions)
  useEvent("USER_PERMISSIONS_CHANGED", fetchPermissions)
  useEvent("ROLES_CHANGED", fetchPermissions)

  const hasPermission = React.useCallback((slug: string) => {
    if (state.isSuperAdmin) return true
    return state.permissions.includes(slug)
  }, [state.isSuperAdmin, state.permissions])

  const value = React.useMemo(() => ({
    permissions: state.permissions,
    isSuperAdmin: state.isSuperAdmin,
    isLoading: state.isLoading,
    hasPermission,
    refresh: fetchPermissions,
  }), [state.permissions, state.isSuperAdmin, state.isLoading, hasPermission, fetchPermissions])

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissions = () => React.useContext(PermissionContext)
