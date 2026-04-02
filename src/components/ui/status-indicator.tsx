import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

export interface StatusIndicatorProps {
  isActive: boolean
  activeLabel?: string
  inactiveLabel?: string
  variant?: "badge" | "switch" | "dot"
  onToggle?: () => void
  disabled?: boolean
}

export function StatusIndicator({
  isActive,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  variant = "switch",
  onToggle,
  disabled = false
}: StatusIndicatorProps) {
  if (variant === "badge") {
    return (
      <Badge 
        variant={isActive ? "default" : "secondary"} 
        className={isActive 
          ? "bg-primary text-primary-foreground border-none hover:bg-primary/90 transition-all font-black uppercase tracking-widest text-[10px]" 
          : "bg-muted text-muted-foreground border-none opacity-50 hover:bg-muted/60 transition-all font-black uppercase tracking-widest text-[10px]"
        }
      >
        {isActive ? activeLabel : inactiveLabel}
      </Badge>
    )
  }

  if (variant === "dot") {
    return (
      <div className="flex items-center gap-2">
         <div className={`size-1.5 rounded-full transition-all ${isActive ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'bg-muted-foreground/30'}`} />
         <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>
            {isActive ? activeLabel : inactiveLabel}
         </span>
      </div>
    )
  }

  // Switch variant
  return (
    <div className="flex items-center gap-3">
      {onToggle !== undefined && (
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      )}
      <span className={`text-[0.8rem] font-black uppercase tracking-widest transition-all ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>
         {isActive ? activeLabel : inactiveLabel}
      </span>
    </div>
  )
}
