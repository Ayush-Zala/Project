"use client"

import { useWorkspaceContext } from "@/providers/workspace-provider"

/**
 * useWorkspace Hook
 * ─────────────────────────────────────────────────────────────
 * Consumes the global WorkspaceContext.
 * Handles both Better Auth member states and Super Admin Ghost Access.
 * ─────────────────────────────────────────────────────────────
 */
export function useWorkspace() {
  return useWorkspaceContext()
}
