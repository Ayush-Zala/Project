"use client"

import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

interface BreadcrumbItemProps {
  label: string
  href?: string
}

interface DashboardHeaderProps {
  breadcrumbs: BreadcrumbItemProps[]
  children?: React.ReactNode
  className?: string
}

/**
 * Unified Dashboard Header
 * Ensures consistent layout, breadcrumb styling, and responsiveness across the dashboard.
 */
export function DashboardHeader({
  breadcrumbs,
  children,
  className,
}: DashboardHeaderProps) {
  return (
    <header className={cn(
      "flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 shadow-sm backdrop-blur-md bg-background/80 sticky top-0 z-50",
      className
    )}>
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  <BreadcrumbItem className={cn(!isLast ? "hidden md:block" : "")}>
                    {item.href && !isLast ? (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="font-semibold text-foreground tracking-tight">
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </header>
  )
}
