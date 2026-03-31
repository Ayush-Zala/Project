import { usePermissions } from "@/providers/permission-provider"

/**
 * useHasPermission Hook
 * ─────────────────────────────────────────────────────────────
 * Optimized frontend utility to check if the current user has a 
 * specific capability. Consumes the PermissionProvider context
 * for near-instant execution.
 * ─────────────────────────────────────────────────────────────
 */
export function useHasPermission(permissionSlug: string) {
  const { hasPermission, isLoading } = usePermissions()
  return hasPermission(permissionSlug)
}
