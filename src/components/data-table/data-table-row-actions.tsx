"use client"

import { MoreHorizontalIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface Action {
  label: string
  onClick: () => void
  variant?: "default" | "destructive"
}

interface DataTableRowActionsProps {
  actions: Action[]
}

export function DataTableRowActions({
  actions,
}: DataTableRowActionsProps) {
  if (actions.length === 0) return null

  return (
    <div className="flex items-center gap-2">

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 rounded-lg bg-muted/20 hover:bg-muted/50 text-muted-foreground transition-all active:scale-95 border border-input shadow-sm"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent 
          align="end" 
          className="w-[160px] bg-popover/95 backdrop-blur-xl border border-input shadow-xl rounded-xl p-1 overflow-hidden"
        >
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={`${action.label}-${index}`}
              onClick={action.onClick}
              className={`
                cursor-pointer px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg
                ${action.variant === "destructive" 
                  ? "text-destructive focus:text-destructive focus:bg-destructive/10" 
                  : "text-muted-foreground focus:text-foreground focus:bg-muted/50"}
              `}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
