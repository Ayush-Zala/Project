"use client"

import * as React from "react"
import { type Table } from "@tanstack/react-table"
import { Settings2Icon, SearchIcon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [searchTerm, setSearchTerm] = React.useState("")

  // 🛡️ Column Manifest: Filter based on local search term
  const filteredColumns = table
    .getAllColumns()
    .filter((column) => {
      // 🛡️ Include any column that allows hiding
      const isHideable = column.getCanHide()
      if (!isHideable) return false

      const title = (column.columnDef.meta as any)?.title || 
                    (typeof column.columnDef.header === 'string' ? column.columnDef.header : "")
      const id = column.id

      // 🛡️ Exclude columns that are purely structural or specifically omitted
      if (id === "select" || id === "actions") return false

      return (
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Toggle columns"
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 border border-border/60 bg-background hover:bg-muted/50 rounded-lg px-3 lg:flex items-center gap-2 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none transition-all text-foreground"
          >
            <Settings2Icon className="size-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">View</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[200px] p-0 bg-popover border border-border shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <DropdownMenuGroup>
          {/* 🔍 Compact Search Manifest */}
          <div className="relative group p-1.5 flex items-center">
             <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
             <Input
               placeholder="Search columns..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               onKeyDown={(e) => e.stopPropagation()}
               className="h-8 pl-8 bg-transparent border-none text-sm font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 transition-all caret-primary"
             />
          </div>

          <DropdownMenuSeparator className="mx-0 h-px bg-border/40" />

          <div className="max-h-[300px] overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {filteredColumns.length === 0 ? (
               <div className="px-4 py-8 text-center animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[13px] text-foreground font-bold tracking-tight">No columns found.</p>
               </div>
            ) : (
              filteredColumns.map((column) => {
                const title = (column.columnDef.meta as any)?.title || 
                   (typeof column.columnDef.header === 'string' 
                      ? column.columnDef.header 
                      : (column.id.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || column.id))

                const isVisible = column.getIsVisible()

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-normal cursor-pointer transition-all hover:bg-muted/50 focus:bg-muted/80 data-[state=checked]:bg-muted/30 group/item outline-none"
                    checked={isVisible}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    <span className={`truncate transition-all duration-200 capitalize ${isVisible ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {title}
                    </span>
                    {isVisible && (
                       <CheckIcon className="size-3 text-foreground/40 animate-in zoom-in-50" />
                    )}
                  </DropdownMenuCheckboxItem>
                )
              })
            )}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
