"use client"

import * as React from "react"
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCwIcon } from "lucide-react"
import { DataTablePagination } from "./data-table-pagination"
import { getCommonPinningStyles } from "@/lib/data-table"

interface DataTableProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The table instance returned from useDataTable hook
   */
  table: TanstackTable<TData>

  /**
   * Floating action bar rendered at the bottom when rows are selected
   */
  floatingBar?: React.ReactNode

  /**
   * Whether to show the pagination component
   * @default true
   */
  showPagination?: boolean

  /**
   * Whether the table is currently loading
   */
  isLoading?: boolean

  /**
   * Whether a search is currently active to suppress intrusive loading symbols
   */
  isSearchActive?: boolean

  /**
   * Whether the table is currently being manually refreshed
   */
  isRefreshing?: boolean
}

export function DataTable<TData>({
  table,
  floatingBar = null,
  children,
  className,
  showPagination = true,
  isLoading = false,
  isSearchActive = false,
  isRefreshing = false,
  ...props
}: DataTableProps<TData>) {
  return (
    <div
      className={cn("w-full space-y-4 overflow-auto", className)}
      {...props}
    >
      {children}
      <div className="rounded-xl border border-border bg-background backdrop-blur-md overflow-x-auto shadow-xl relative">
        <Table className="table-fixed w-max min-w-full border-collapse">
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const size = header.column.getSize()
                  return (
                    <TableHead 
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        ...getCommonPinningStyles({ column: header.column }),
                        width: `${size}px`,
                        minWidth: `${size}px`,
                      }}
                      className={cn(
                        "font-bold uppercase text-[0.85rem] tracking-widest text-muted-foreground py-4 px-6 text-left transition-all",
                        header.column.getIsPinned() && "bg-muted/80 backdrop-blur-sm z-20"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && (isRefreshing || !table.getRowModel().rows?.length) && !isSearchActive ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="border-border hover:bg-transparent">
                  {table.getAllColumns().filter(c => c.getIsVisible()).map((column, cellIndex) => {
                    const size = column.getSize()
                    return (
                      <TableCell 
                        key={cellIndex}
                        style={{
                          ...getCommonPinningStyles({ column }),
                          width: `${size}px`,
                          minWidth: `${size}px`,
                        }}
                        className={cn(
                          "py-4 px-6",
                          column.getIsPinned() && "bg-background/90 backdrop-blur-sm z-10"
                        )}
                      >
                        <Skeleton className="h-6 w-full rounded-[6px] opacity-70" />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-border group hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const size = cell.column.getSize()
                    return (
                      <TableCell 
                        key={cell.id}
                        style={{
                          ...getCommonPinningStyles({ column: cell.column }),
                          width: `${size}px`,
                          minWidth: `${size}px`,
                        }}
                        className={cn(
                          "py-4 px-6 overflow-hidden",
                          cell.column.getIsPinned() && "bg-background/90 backdrop-blur-sm z-10"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-64 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 bg-muted/20 rounded-full mb-2">
                       <span className="text-4xl text-muted-foreground/30 font-black italic">!</span>
                    </div>
                    <p className="text-base font-medium text-muted-foreground italic transition-all">
                      Zero matching records found in the current segment
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        {showPagination && <DataTablePagination table={table} />}
        {floatingBar}
      </div>
    </div>
  )
}
