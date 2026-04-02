"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  useQueryStates,
} from "nuqs"

import { useDebounce } from "./use-debounce"
import type { ExtendedColumnFilter } from "@/types/data-table"

interface UseDataTableProps<TData, TValue> {
  /**
   * The data to display in the table
   */
  data: TData[]

  /**
   * The column definitions for the table
   */
  columns: ColumnDef<TData, TValue>[]

  /**
   * The total number of pages in the data source
   */
  pageCount: number

  /**
   * Default column visibility state
   */
  initialColumnVisibility?: VisibilityState
}

import { isFieldSortable } from "@/lib/sorting-guard"

export function useDataTable<TData, TValue>({
  data,
  columns,
  pageCount,
  initialColumnVisibility = {},
}: UseDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)

  // 🛡️ Dynamic Sorting Guard: Sanitize columns before table initialization
  const sanitizedColumns = React.useMemo(() => {
    return columns.map((column: any) => {
      const columnId = column.id || column.accessorKey || (typeof column.header === "string" ? column.header : undefined)
      
      // If column is already explicitly disabled, respect that. 
      // Otherwise, check the global Sorting Intelligence Registry
      if (column.enableSorting === false) return column

      return {
        ...column,
        enableSorting: isFieldSortable(columnId)
      }
    })
  }, [columns])

  // URL state synchronization via nuqs
  const [queryStates, setQueryStates] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    per_page: parseAsInteger.withDefault(10),
    sort: parseAsString.withDefault(""),
    filters: parseAsArrayOf(parseAsJson<ExtendedColumnFilter>((v) => v as ExtendedColumnFilter)).withDefault([]),
    join: parseAsString.withDefault("and"),
    search: parseAsString.withDefault(""),
  }, {
    shallow: true,
  })

  // Derive table state from URL query params
  const pagination: PaginationState = {
    pageIndex: queryStates.page - 1,
    pageSize: queryStates.per_page,
  }

  const sorting: SortingState = queryStates.sort
    ? queryStates.sort.split(".").map((s) => {
        const [id, desc] = s.split(":")
        return { id, desc: desc === "desc" }
      })
    : []

  const columnFilters: ColumnFiltersState = queryStates.filters.map((f) => ({
    id: f.id,
    value: f.value,
  }))

  const table = useReactTable({
    data,
    columns: sanitizedColumns,
    pageCount,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const next = updater(pagination)
        setQueryStates({
          page: next.pageIndex + 1,
          per_page: next.pageSize,
        })
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        const next = updater(sorting)
        setQueryStates({
          sort: next.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join("."),
          page: 1, // Reset to first page on sort
        })
      }
    },
    onColumnFiltersChange: (updater) => {
       if (typeof updater === "function") {
         const next = updater(columnFilters)
         const nextFilters = next as ExtendedColumnFilter[]
         setQueryStates({
           filters: nextFilters,
           page: 1, // Reset to first page on filter
         })
       }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  const onSearchChange = React.useCallback(
    (value: string) => {
      setQueryStates({ search: value || null, page: 1 })
    },
    [setQueryStates]
  )

  const setFilters = React.useCallback(
    (updaterOrValue: ExtendedColumnFilter[] | ((prev: ExtendedColumnFilter[]) => ExtendedColumnFilter[])) => {
      const nextFilters = typeof updaterOrValue === "function" 
        ? updaterOrValue(queryStates.filters) 
        : updaterOrValue
      
      setQueryStates({
        filters: nextFilters,
        page: 1,
      })
    },
    [queryStates.filters, setQueryStates]
  )

  const onFilterReset = React.useCallback(() => {
    setQueryStates({
      search: null,
      filters: [],
      page: 1,
    })
  }, [setQueryStates])

  return { 
    table, 
    onSearchChange, 
    search: queryStates.search,
    filters: queryStates.filters,
    setFilters,
    onFilterReset,
    // Reactive query state for server-side side fetching
    sort: queryStates.sort,
    page: queryStates.page,
    perPage: queryStates.per_page,
  }
}
