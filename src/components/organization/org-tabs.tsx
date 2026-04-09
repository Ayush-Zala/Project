"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users2, Layers } from "lucide-react"
import { useHasPermission } from "@/hooks/use-has-permission"

import { motion } from "framer-motion"

export function OrgTabs() {
  const pathname = usePathname()

  const canViewMembers = useHasPermission("organisation_member:read")
  const canViewTeams = useHasPermission("organisation_team:read")

  const tabs = [
    {
      name: "Members",
      href: "/dashboard/organisation/members",
      icon: Users2,
      visible: canViewMembers
    },
    {
      name: "Teams",
      href: "/dashboard/organisation/teams",
      icon: Layers,
      visible: canViewTeams
    },
  ].filter(tab => tab.visible)

  return (
    <div className="flex items-center p-1 bg-muted/20 border border-border/40 rounded-full w-fit shadow-sm backdrop-blur-sm relative">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const Icon = tab.icon

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "flex items-center gap-2.5 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 relative group",
              isActive ? "text-background" : "text-muted-foreground/60 hover:text-foreground/80"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="org-active-pill"
                className="absolute inset-0 bg-foreground rounded-full shadow-xl shadow-foreground/10 ring-1 ring-foreground/20"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <Icon className={cn("size-3.5 transition-transform duration-300 relative z-10", isActive && "scale-110")} />
            <span className="relative z-10 font-black">{tab.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
