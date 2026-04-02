import type { ColumnSort } from "@tanstack/react-table"

export type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "equals"
  | "doesNotEqual"
  | "isEmpty"
  | "isNotEmpty"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqualTo"
  | "lessThanOrEqualTo"
  | "isBetween"
  | "isRelation"

export type FilterVariant = 
  | "text" 
  | "number" 
  | "select" 
  | "multi-select" 
  | "date" 
  | "date-range" 
  | "boolean"

export interface DataTableFilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
}

export interface DataTableFilterField<TData> {
  id: keyof TData
  label: string
  placeholder?: string
  options?: DataTableFilterOption[]
  variant?: FilterVariant
}

export interface ExtendedColumnFilter {
  id: string
  value: string | string[] | number | number[] | { from: Date; to: Date } | boolean
  operator: FilterOperator
}

export interface ExtendedColumnSort extends ColumnSort {
  desc: boolean
}

export interface DataTableConfig {
  operators: {
    label: string
    value: FilterOperator
    types: FilterVariant[]
  }[]
}
