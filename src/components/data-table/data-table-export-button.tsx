"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"
import { type Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { exportToCSV } from "@/lib/export"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DataTableExportButtonProps<TData> {
  table: Table<TData>
  filename?: string
}

export function DataTableExportButton<TData>({
  table,
  filename = "export-data",
}: DataTableExportButtonProps<TData>) {
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      const finalFilename = `${filename}`
      exportToCSV(table, finalFilename)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="h-8 border border-border/60 bg-background hover:bg-muted/50 rounded-lg px-3 flex items-center gap-2 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none transition-all text-foreground"
    >
      <DownloadIcon className="size-3.5" />
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] hidden lg:inline-block">
        {isExporting ? "Processing..." : "Export"}
      </span>
    </Button>
  )
}
