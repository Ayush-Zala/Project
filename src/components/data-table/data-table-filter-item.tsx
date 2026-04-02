"use client"

import * as React from "react"
import { Trash2Icon } from "lucide-react"
import { type Table } from "@tanstack/react-table"

import { dataTableConfig } from "@/lib/data-table-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react"
import { DataTableFilterField, ExtendedColumnFilter } from "@/types/data-table"

interface DataTableFilterItemProps<TData> {
  index: number
  table: Table<TData>
  selectedField: DataTableFilterField<TData> | undefined
  selectedOperator: string | undefined
  value: string | string[] | number | number[] | boolean | { from: Date; to: Date } | undefined
  onRemove: () => void
  onFieldChange: (field: DataTableFilterField<TData>) => void
  onOperatorChange: (operator: string) => void
  onValueChange: (value: any) => void
  allFields: DataTableFilterField<TData>[]
}

export function DataTableFilterItem<TData>({
  index,
  selectedField,
  selectedOperator,
  value,
  onRemove,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  allFields,
}: DataTableFilterItemProps<TData>) {
  const [fieldOpen, setFieldOpen] = React.useState(false)
  const [fieldSearch, setFieldSearch] = React.useState("")
  const [operatorOpen, setOperatorOpen] = React.useState(false)
  const operators = React.useMemo(() => {
    if (!selectedField) return []
    return dataTableConfig.operators.filter((op) =>
      op.types.includes(selectedField.variant || "text")
    )
  }, [selectedField])

  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="w-14 text-right pr-2 text-sm text-muted-foreground flex items-center justify-end">
         {index === 0 ? "Where" : "and"}
      </div>

      {/* FIELD COMBOBOX */}
      <Popover open={fieldOpen} onOpenChange={setFieldOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 w-[140px] justify-between text-sm rounded-md shadow-none px-2.5 font-normal border-input hover:bg-muted/50"
          >
            {selectedField ? selectedField.label : "Select field..."}
            <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0 shadow-2xl rounded-xl border border-input overflow-hidden" align="start">
          <div className="flex items-center border-b border-border/40 px-3 py-1">
            <SearchIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground opacity-70" />
            <Input 
              placeholder="Search fields..." 
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              className="h-8 flex-1 bg-transparent text-sm border-0 focus-visible:ring-0 px-0 outline-none shadow-none font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1.5 text-sm bg-popover">
            {allFields
              .filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase()))
              .map(field => (
                <button
                  key={field.id as string}
                  onClick={() => {
                    onFieldChange(field)
                    setFieldOpen(false)
                    setFieldSearch("")
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-primary/10 rounded-lg text-left transition-colors cursor-pointer text-foreground font-medium"
                >
                  {field.label}
                  {selectedField?.id === field.id && <CheckIcon className="h-4 w-4" />}
                </button>
            ))}
            {allFields.length > 0 && allFields.filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase())).length === 0 && (
               <div className="p-3 text-center text-sm text-muted-foreground">No matches found.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* OPERATOR COMBOBOX */}
      <Popover open={operatorOpen} onOpenChange={setOperatorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={!selectedField}
            className="h-8 w-[140px] justify-between text-sm rounded-md shadow-none px-2.5 font-normal border-input hover:bg-muted/50 disabled:opacity-50"
          >
            {selectedOperator ? operators.find(o => o.value === selectedOperator)?.label : "Operator..."}
            <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0 shadow-2xl rounded-xl border border-input overflow-hidden" align="start">
          <div className="max-h-[220px] overflow-y-auto p-1.5 text-sm bg-popover">
            {operators.map(op => (
              <button
                key={op.value}
                onClick={() => {
                  onOperatorChange(op.value)
                  setOperatorOpen(false)
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-primary/10 rounded-lg text-left transition-colors cursor-pointer text-foreground font-medium"
              >
                {op.label}
                {selectedOperator === op.value && <CheckIcon className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-[120px]">
        {selectedField?.variant === "select" && selectedField.options ? (
          <Select
             value={String(value)}
             onValueChange={onValueChange}
          >
             <SelectTrigger className="h-8 w-full text-sm rounded-md shadow-none focus:ring-primary/20">
               <SelectValue placeholder="Value" />
             </SelectTrigger>
             <SelectContent className="shadow-2xl">
               <SelectGroup>
                 {selectedField.options.map((opt) => (
                   <SelectItem key={opt.value} value={opt.value} className="text-sm">
                     {opt.label}
                   </SelectItem>
                 ))}
               </SelectGroup>
             </SelectContent>
          </Select>
        ) : (
          <Input
            placeholder="Value..."
            value={value as string}
            onChange={(e) => onValueChange(e.target.value)}
            className="h-8 w-full text-sm rounded-md shadow-none focus:ring-primary/20"
          />
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-muted border border-border/40 rounded-md shrink-0 transition-all shadow-none"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}
