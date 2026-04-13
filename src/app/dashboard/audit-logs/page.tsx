"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  RefreshCwIcon,
  ShieldCheckIcon,
  FileSearchIcon,
  HistoryIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { useSocket } from "@/providers/socket-provider" // Assuming it might be needed for real-time later
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { useHasPermission } from "@/hooks/use-has-permission"

import { PageShell } from "@/components/dashboard/page-shell"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getAuditColumns } from "@/components/audit/audit-table-columns"
import { AuditDiffViewer } from "@/components/audit/audit-diff-viewer"
import { DataTableFilterField } from "@/types/data-table"

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog / Viewer states
  const [selectedLog, setSelectedLog] = React.useState<any>(null)
  const [isDiffViewerOpen, setIsDiffViewerOpen] = React.useState(false)

  // 🛡️ Forensic Guards
  const canReadAudits = useHasPermission("audit:read")

  // 📋 Data Table Implementation
  const columns = React.useMemo(() => getAuditColumns({
    onViewDiff: (log) => {
      setSelectedLog(log);
      setIsDiffViewerOpen(true);
    },
  }), [])

  const {
    table,
    onSearchChange,
    onFilterReset,
    search,
    filters,
    setFilters,
    sort,
    page,
    perPage
  } = useDataTable({
    data: logs,
    columns,
    pageCount,
  })

  // 🛡️ Forensic Retrieval
  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLogs(data.logs)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Forensic retrieval failed")
    } finally {
      setIsLoading(false)
    }
  }, [page, perPage, sort, search, filters])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLogs()
    setIsRefreshing(false)
    toast.success("Audit records synchronized")
  }

  const filterFields: DataTableFilterField<any>[] = [
    {
      label: "Action Type",
      id: "action",
      variant: "select",
      options: [
        { label: "Create", value: "CREATE" },
        { label: "Update", value: "UPDATE" },
        { label: "Delete", value: "DELETE" },
      ]
    },
    { label: "Resource", id: "resource", variant: "text" },
    { label: "IP Address", id: "ipAddress", variant: "text" },
  ]

  // 🛡️ Unauthorized Protection
  if (!isLoading && !canReadAudits) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 bg-background">
        <div className="size-16 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 animate-pulse border border-rose-500/20 shadow-lg shadow-rose-500/10">
          <ShieldCheckIcon className="size-8" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">Access Restricted</h1>
        <p className="text-[12px] font-medium text-muted-foreground italic max-w-sm leading-relaxed">
          Your security clearance is insufficient to view activity history. <br />
          <span className="text-primary font-bold">Protocol Status: Forbidden.</span>
        </p>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Audit Logs" }
        ]}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95"
          title="Reload Activity Data"
        >
          <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </DashboardHeader>

      <PageShell>
        <DataTable
          table={table}
          isLoading={isLoading}
          isSearchActive={!!search}
          isRefreshing={isRefreshing}
        >
          <DataTableAdvancedToolbar
            table={table}
            filterFields={filterFields}
            filters={filters}
            setFilters={setFilters}
            onSearchChange={onSearchChange}
            onFilterReset={onFilterReset}
            search={search}
            exportFilename="audit-logs"
            className="mb-4"
          />
        </DataTable>

        <div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase text-center mt-6 flex items-center justify-center gap-4 opacity-40">
          <div className="h-px w-20 bg-border" />
          Analyzed {logs.length} of {totalCount} Activity Records
          <div className="h-px w-20 bg-border" />
        </div>
      </PageShell>

      <AuditDiffViewer
        log={selectedLog}
        open={isDiffViewerOpen}
        onOpenChange={setIsDiffViewerOpen}
      />
    </>
  )
}
