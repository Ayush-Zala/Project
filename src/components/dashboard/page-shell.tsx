import React from "react"
import { cn } from "@/lib/utils"

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <div 
      className={cn(
        "flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}
