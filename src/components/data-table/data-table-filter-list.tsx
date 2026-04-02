"use client"

import * as React from "react"
import { type Table } from "@tanstack/react-table"
import { FilterIcon, PlusIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface DataTableFilterListProps<TData> {
  table: Table<TData>
}

export function DataTableFilterList<TData>({
  table,
}: DataTableFilterListProps<TData>) {
  const columnFilters = table.getState().columnFilters

  if (columnFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <Separator orientation="vertical" className="h-4 bg-border/40" />
      {columnFilters.map((filter) => {
        const column = table.getColumn(filter.id)
        if (!column) return null

        return (
          <Badge
            key={filter.id}
            variant="secondary"
            className="h-7 gap-1.5 rounded-lg border-primary/20 bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/20"
          >
            <span className="opacity-60">{column.id}:</span>
            <span className="text-foreground">{String(filter.value)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-4 p-0 hover:bg-transparent hover:text-red-500 transition-colors"
              onClick={() => column.setFilterValue(undefined)}
            >
              <XIcon className="size-2.5" />
            </Button>
          </Badge>
        )
      })}
    </div>
  )
}
