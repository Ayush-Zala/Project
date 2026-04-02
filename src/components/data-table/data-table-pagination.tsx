import { type Table } from "@tanstack/react-table"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto px-2 py-1 sm:flex-row sm:gap-8">
      <div className="flex-1 whitespace-nowrap text-xs text-muted-foreground italic tracking-tight">
        <span className="font-bold text-foreground">
          {table.getFilteredSelectedRowModel().rows.length}
        </span>
        {" of "}
        <span className="font-bold text-foreground">
          {table.getFilteredRowModel().rows.length}
        </span>
        {" row(s) selected"}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="whitespace-nowrap text-xs font-medium text-muted-foreground uppercase opacity-70">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem] bg-background/50 border-input rounded-lg text-xs font-bold transition-all hover:border-primary/40">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top" className="bg-popover border-input">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs transition-colors focus:bg-primary/10 focus:text-primary">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/20 px-3 py-1.5 rounded-lg border border-border/20 translate-y-[1px]">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          <span className="ml-1 text-foreground">{table.getPageCount()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-input hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-input hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-input hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-input hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
