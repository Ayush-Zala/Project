"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users2, Layers } from "lucide-react"

export function OrgTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Members",
      href: "/dashboard/organisation/members",
      icon: Users2,
    },
    {
      name: "Teams",
      href: "/dashboard/organisation/teams",
      icon: Layers,
    },
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/50 rounded-xl w-fit">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const Icon = tab.icon

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              isActive 
                ? "bg-background text-primary shadow-sm border border-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground/50")} />
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
