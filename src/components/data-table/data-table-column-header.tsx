import { type Column } from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  justify?: "start" | "center" | "end"
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  justify = "start",
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(justify === "center" && "text-center", justify === "end" && "text-right", className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2", justify === "center" && "justify-center", justify === "end" && "justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={
                column.getIsSorted() === "desc"
                  ? "Sorted descending. Click to sort ascending."
                  : column.getIsSorted() === "asc"
                    ? "Sorted ascending. Click to sort descending."
                    : "Not sorted. Click to sort ascending."
              }
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 data-state-open:bg-accent hover:bg-primary/5 transition-all group/header",
                justify === "start" && "-ml-3"
              )}
            >
              <span className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground group-hover/header:text-primary transition-colors">{title}</span>
              {column.getCanSort() && (
                column.getIsSorted() === "desc" ? (
                  <ArrowDownIcon className="ml-2 size-3.5 text-primary animate-in fade-in slide-in-from-top-1" aria-hidden="true" />
                ) : column.getIsSorted() === "asc" ? (
                  <ArrowUpIcon className="ml-2 size-3.5 text-primary animate-in fade-in slide-in-from-bottom-1" aria-hidden="true" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 size-3.5 text-muted-foreground/50 group-hover/header:text-primary/50 transition-colors" aria-hidden="true" />
                )
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="bg-popover border-input min-w-[120px]">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem
                aria-label="Sort ascending"
                onClick={() => column.toggleSorting(false)}
                className="gap-2 transition-colors focus:bg-primary/10 focus:text-primary"
              >
                <ArrowUpIcon className="size-3.5 text-muted-foreground/70" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-tight">Asc</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label="Sort descending"
                onClick={() => column.toggleSorting(true)}
                className="gap-2 transition-colors focus:bg-primary/10 focus:text-primary"
              >
                <ArrowDownIcon className="size-3.5 text-muted-foreground/70" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-tight">Desc</span>
              </DropdownMenuItem>
            </>
          )}
          {column.getCanSort() && column.getCanHide() && (
            <DropdownMenuSeparator className="bg-border/40" />
          )}
          {column.getCanHide() && (
            <DropdownMenuItem
              aria-label="Hide column"
              onClick={() => column.toggleVisibility(false)}
              className="gap-2 transition-colors focus:bg-red-500/10 focus:text-red-500"
            >
              <EyeOffIcon className="size-3.5 text-muted-foreground/70" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-tight text-red-400">Hide</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
