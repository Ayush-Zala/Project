"use client"

import React from "react"
import { usePermissions } from "@/providers/permission-provider"
import { usePathname } from "next/navigation"
import { ShieldAlertIcon } from "lucide-react"

export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { hasPermission, isLoading, isSuperAdmin } = usePermissions()
  const pathname = usePathname()

  if (isLoading) return null // Handled by Layout spinner usually

  const PROTECTED_MODULES = [
    { prefix: "/dashboard/roles", permission: "roles:read", name: "Roles" },
    { prefix: "/dashboard/users", permission: "users:read", name: "Users" },
    { prefix: "/dashboard/permissions", permission: "permissions:read", name: "Permissions Manifest" },
  ]

  const activeModule = PROTECTED_MODULES.find(m => pathname.startsWith(m.prefix))

  // Bypass if public or super-admin
  if (!activeModule || isSuperAdmin) return <>{children}</>

  if (!hasPermission(activeModule.permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="p-6 bg-red-500/10 rounded-full mb-6 ring-8 ring-red-500/5">
          <ShieldAlertIcon className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          Your current security clearance does not allow access to the <span className="font-bold text-foreground">{activeModule.name}</span> module.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-8 uppercase tracking-widest font-mono">
           Industrial RBAC Enforcement active
        </p>
      </div>
    )
  }

  return <>{children}</>
}
