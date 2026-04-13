"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableExportButton } from "./data-table-export-button"

interface DataTableToolbarProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>
  exportFilename?: string
}

export function DataTableToolbar<TData>({
  table,
  exportFilename,
  className,
  children,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between space-x-2 overflow-auto p-1 bg-muted/20 rounded-xl border border-input backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative group">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filter records..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="h-10 w-[200px] lg:w-[300px] pl-9 bg-background/50 border-input focus:border-primary/50 transition-all rounded-lg text-xs font-medium"
          />
        </div>
        {children}
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-10 px-3 lg:px-4 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all active:scale-95 gap-2"
          >
            Reset
            <XIcon className="ml-1 size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableExportButton table={table} filename={exportFilename} />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
