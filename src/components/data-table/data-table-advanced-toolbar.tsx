"use client"

import * as React from "react"
import { type Table } from "@tanstack/react-table"
import { 
  FilterIcon, 
  PlusIcon, 
  SearchIcon, 
  Settings2Icon, 
  XIcon 
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { DataTableFilterField, ExtendedColumnFilter } from "@/types/data-table"
import { DataTableFilterItem } from "./data-table-filter-item"
import { DataTableViewOptions } from "./data-table-view-options"
import { useDebounce } from "@/hooks/use-debounce"
import { DataTableExportButton } from "./data-table-export-button"

interface DataTableAdvancedToolbarProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>
  filterFields: DataTableFilterField<TData>[]
  filters: ExtendedColumnFilter[]
  setFilters: (filters: ExtendedColumnFilter[]) => void
  onSearchChange?: (value: string) => void
  onFilterReset?: () => void
  search?: string
  exportFilename?: string
}

export function DataTableAdvancedToolbar<TData>({
  table,
  filterFields,
  filters,
  setFilters,
  onSearchChange,
  onFilterReset,
  search,
  exportFilename,
  className,
  children,
  ...props
}: DataTableAdvancedToolbarProps<TData>) {
  const isFiltered = filters.length > 0 || !!search
  const [searchValue, setSearchValue] = React.useState(search ?? "")
  const debouncedSearchValue = useDebounce(searchValue, 300)

  const latestSearchProp = React.useRef(search ?? "")

  // Pull: Synchronize local state with external search prop (for clearing/initial load)
  React.useEffect(() => {
    latestSearchProp.current = search ?? ""
    setSearchValue(search ?? "")
  }, [search])

  // Push: Debounced local state updates the global search handler
  React.useEffect(() => {
    // Only push if the debounced value actually differs from what we last received from props
    if (debouncedSearchValue !== latestSearchProp.current) {
      onSearchChange?.(debouncedSearchValue)
    }
  }, [debouncedSearchValue, onSearchChange])

  const addFilter = () => {
    if (filterFields.length === 0) return
    const firstField = filterFields[0]
    setFilters([
      ...filters,
      {
        id: firstField.id as string,
        operator: firstField.variant === "select" || firstField.variant === "boolean" || firstField.variant === "number" ? "equals" : "contains",
        value: "",
      },
    ])
  }

  const updateFilter = (index: number, updates: Partial<ExtendedColumnFilter>) => {
    const newFilters = [...filters]
    newFilters[index] = { ...newFilters[index], ...updates }
    setFilters(newFilters)
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between space-x-2 py-1",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center space-x-2">
        {onSearchChange && (
           <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Global Research..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="h-10 w-[200px] lg:w-[300px] pl-9 pr-9 bg-background/50 border-input focus:border-primary/50 transition-all rounded-xl text-[0.8rem] font-medium outline-none"
              />
              {!!search && (
                <button
                  onClick={() => {
                    setSearchValue("")
                    onFilterReset?.()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-red-400 transition-all active:scale-90"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
           </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border border-border/60 bg-background hover:bg-muted/50 rounded-lg px-3 flex items-center gap-2 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none transition-all text-foreground"
            >
              <FilterIcon className="size-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Filters</span>
              {filters.length > 0 && (
                <span className="flex items-center justify-center size-4 rounded-full bg-muted-foreground/20 text-[9px] font-black text-foreground ml-1">
                  {filters.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={cn(
              "p-4 bg-popover border border-input shadow-2xl rounded-2xl flex flex-col gap-4",
              filters.length > 0 ? "w-[600px]" : "w-[300px]"
            )} 
            align="start"
          >
            {filters.length > 0 && (
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[0.95rem] font-bold text-foreground transition-all">Filters</h4>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              {filters.length === 0 && (
                <div className="flex flex-col py-1 px-1">
                   <h4 className="font-bold text-foreground text-[0.95rem]">No filters applied</h4>
                   <p className="text-[0.85rem] text-muted-foreground mt-0.5">Add filters to refine your rows.</p>
                </div>
              )}
              {filters.map((filter, index) => (
                <DataTableFilterItem
                  key={index}
                  index={index}
                  table={table}
                  selectedField={filterFields.find(f => f.id === filter.id)}
                  selectedOperator={filter.operator}
                  value={filter.value}
                  onRemove={() => removeFilter(index)}
                  onFieldChange={(field) => updateFilter(index, { 
                    id: field.id as string, 
                    value: "", 
                    operator: field.variant === "select" || field.variant === "boolean" || field.variant === "number" ? "equals" : "contains" 
                  })}
                  onOperatorChange={(op) => updateFilter(index, { operator: op as any })}
                  onValueChange={(val) => {
                    const field = filterFields.find(f => f.id === filter.id)
                    let formattedVal = val
                    
                    if (val === "true" || val === "false") {
                      if (field?.options?.some(o => String(o.value) === "true" || String(o.value) === "false")) {
                        formattedVal = val === "true" ? true : false
                      }
                    }
                    
                    updateFilter(index, { value: formattedVal })
                  }}
                  allFields={filterFields}
                />
              ))}
              
              <div className="flex items-center mt-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFilter}
                  className="h-8 shadow-none font-medium px-4"
                >
                  Add filter
                </Button>
                {filters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters([])}
                    className="h-8 shadow-none font-medium px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {children}

      </div>
      <div className="flex items-center gap-2">
        <DataTableExportButton table={table} filename={exportFilename} />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
