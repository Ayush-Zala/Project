"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { 
  HistoryIcon, 
  ArrowRightIcon, 
  MinusCircleIcon, 
  PlusCircleIcon,
  HardDriveIcon,
  LinkIcon,
  ToggleLeftIcon,
  AlertTriangleIcon,
  FilterIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuditDiffViewerProps {
  log: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CREATE:   { label: "Create",  color: "emerald", icon: PlusCircleIcon },
  UPDATE:   { label: "Update",  color: "blue",    icon: ArrowRightIcon },
  DELETE:   { label: "Delete",  color: "rose",    icon: MinusCircleIcon },
  TOGGLE:   { label: "Toggle",  color: "orange",  icon: ToggleLeftIcon },
  ASSIGN:   { label: "Assign",  color: "indigo",  icon: LinkIcon },
  UNASSIGN: { label: "Unassign",color: "slate",   icon: MinusCircleIcon },
  FAILURE:  { label: "Failure", color: "rose",    icon: AlertTriangleIcon },
}

// Format any value for display
function formatValue(val: any): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "true ✓" : "false ✗"
  if (typeof val === "object") return JSON.stringify(val, null, 2)
  return String(val)
}

// Colored value display
function ValueChip({ value, variant }: { value: any; variant: "before" | "after" | "neutral" }) {
  const colorMap = {
    before:  "bg-rose-500/5 border-rose-500/15 text-rose-600",
    after:   "bg-emerald-500/5 border-emerald-500/15 text-emerald-700",
    neutral: "bg-muted/50 border-border/40 text-foreground/70",
  }
  const iconMap = {
    before:  <MinusCircleIcon className="size-2.5 text-rose-500 mt-[2px] shrink-0" />,
    after:   <PlusCircleIcon  className="size-2.5 text-emerald-500 mt-[2px] shrink-0" />,
    neutral: null,
  }
  return (
    <div className={`flex items-start gap-1.5 border rounded-md px-2 py-1.5 transition-all ${colorMap[variant]}`}>
      {iconMap[variant]}
      <code className="text-[10px] font-mono break-all leading-relaxed whitespace-pre-wrap">
        {formatValue(value)}
      </code>
    </div>
  )
}

// Renders a single before→after row
function DiffRow({ rowKey, before, after, showBefore, showAfter }: {
  rowKey: string;
  before: any;
  after: any;
  showBefore: boolean;
  showAfter: boolean;
}) {
  const hasChanged = JSON.stringify(before) !== JSON.stringify(after)

  return (
    <tr className={`group ${hasChanged ? "bg-primary/[0.015]" : ""}`}>
      <td className="py-3 pr-4 align-top w-[28%]">
        <span className="text-[11px] font-bold font-mono text-foreground/60 truncate block">{rowKey}</span>
      </td>
      <td className="py-3 align-top">
        <div className="flex flex-col gap-1.5">
          {showBefore && before !== undefined && (
            <ValueChip value={before} variant="before" />
          )}
          {showBefore && showAfter && before !== undefined && after !== undefined && (
            <div className="flex justify-center opacity-20">
              <ArrowRightIcon className="size-3" />
            </div>
          )}
          {showAfter && after !== undefined && (
            <ValueChip value={after} variant="after" />
          )}
          {/* If neither before nor after condition met, show neutral for raw data */}
          {!showBefore && !showAfter && (
            <ValueChip value={before ?? after} variant="neutral" />
          )}
        </div>
      </td>
    </tr>
  )
}

export function AuditDiffViewer({ log, open, onOpenChange }: AuditDiffViewerProps) {
  if (!log || !log.metaData) return null;

  const meta = log.metaData;
  const action = log.action as string;
  const isCreate   = action === "CREATE"
  const isDelete   = action === "DELETE"
  const isUpdate   = action === "UPDATE"
  const isToggle   = action === "TOGGLE"
  const isAssign   = action === "ASSIGN" || action === "UNASSIGN"
  const isFailure  = log.status === "FAILURE"

  // Determine rendering strategy based on metadata shape
  const hasBefore  = "before" in meta
  const hasAfter   = "after"  in meta
  const hasFilter  = "filter"  in meta
  const hasData    = "data"    in meta
  const hasArgs    = "args"    in meta

  // Collect all keys across before + after
  const allKeys = Array.from(new Set([
    ...Object.keys(meta.before || {}),
    ...Object.keys(meta.after  || {}),
  ]))

  const actionMeta = ACTION_META[action] || ACTION_META["UPDATE"]
  const ActionIcon = actionMeta.icon

  const renderTable = (keys: string[], beforeObj: any, afterObj: any, showBefore: boolean, showAfter: boolean) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border/40">
          <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 w-[28%]">Property</th>
          <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">State Change</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/15">
        {keys.map(key => (
          <DiffRow
            key={key}
            rowKey={key}
            before={beforeObj?.[key]}
            after={afterObj?.[key]}
            showBefore={showBefore}
            showAfter={showAfter}
          />
        ))}
      </tbody>
    </table>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner ${isFailure ? "bg-rose-500/10 text-rose-500" : ""}`}>
              <HistoryIcon className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                Forensic State Analysis
                <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase py-0 leading-tight">
                  Log #{log.id}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-[9px] font-black tracking-widest uppercase py-0 leading-tight flex items-center gap-1
                    ${isFailure ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-primary/5 text-primary border-primary/20"}`}
                >
                  <ActionIcon className="size-2.5" />
                  {action}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-[11px] font-medium text-muted-foreground italic -mt-1">
                Detailed diff of <span className="font-bold text-foreground/70">{log.resource}</span> mutation — {log.reason || "No reason provided"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] p-6">
          <div className="flex flex-col gap-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >

                {/* ── FAILURE: show args context ── */}
                {isFailure && hasArgs && (
                  <div>
                    <SectionLabel icon={AlertTriangleIcon} label="Failure Context" color="rose" />
                    <div className="mt-2">
                      {Object.keys(meta.args || {}).length > 0 ? renderTable(
                        Object.keys(meta.args),
                        meta.args, null, false, false
                      ) : <EmptyState message="No failure args captured." />}
                    </div>
                  </div>
                )}

                {/* ── CREATE: show 'after' only ── */}
                {!isFailure && isCreate && hasBefore && hasAfter && allKeys.length > 0 && (
                  <div>
                    <SectionLabel icon={PlusCircleIcon} label="Created Fields" color="emerald" />
                    <div className="mt-2">
                      {renderTable(allKeys, meta.before, meta.after, false, true)}
                    </div>
                  </div>
                )}

                {/* ── DELETE: show 'before' only ── */}
                {!isFailure && isDelete && hasBefore && allKeys.length > 0 && (
                  <div>
                    <SectionLabel icon={MinusCircleIcon} label="Deleted Fields" color="rose" />
                    <div className="mt-2">
                      {renderTable(allKeys, meta.before, meta.after, true, false)}
                    </div>
                  </div>
                )}

                {/* ── UPDATE / TOGGLE: show before→after diff ── */}
                {!isFailure && (isUpdate || isToggle) && hasBefore && hasAfter && allKeys.length > 0 && (
                  <div>
                    <SectionLabel icon={ArrowRightIcon} label={isToggle ? "Toggle State Change" : "Updated Fields"} color={isToggle ? "orange" : "blue"} />
                    <div className="mt-2">
                      {renderTable(allKeys, meta.before, meta.after, true, true)}
                    </div>
                  </div>
                )}

                {/* ── ASSIGN / UNASSIGN: show 'after' (the created record) ── */}
                {!isFailure && isAssign && (
                  <div>
                    <SectionLabel icon={LinkIcon} label={action === "UNASSIGN" ? "Unassigned Record" : "Assigned Record"} color="indigo" />
                    <div className="mt-2">
                      {/* Show after if exists, else before */}
                      {(() => {
                        const payload = meta.after || meta.before
                        const keys = Object.keys(payload || {})
                        return keys.length > 0
                          ? renderTable(keys, null, payload, false, true)
                          : <EmptyState message="No assignment payload captured." />
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Bulk / Filter ops ── */}
                {!isFailure && hasFilter && (
                  <div>
                    <SectionLabel icon={FilterIcon} label="Filter Criteria" color="slate" />
                    <div className="mt-2">
                      {renderTable(Object.keys(meta.filter || {}), meta.filter, null, false, false)}
                    </div>
                  </div>
                )}
                {!isFailure && hasData && (
                  <div>
                    <SectionLabel icon={PlusCircleIcon} label="Payload Data" color="emerald" />
                    <div className="mt-2">
                      {renderTable(Object.keys(meta.data || {}), null, meta.data, false, true)}
                    </div>
                  </div>
                )}

                {/* ── Fallback empty state ── */}
                {!isFailure && allKeys.length === 0 && !hasFilter && !hasData && (
                  <EmptyState message="Operation affected zero data fields." />
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-muted/20 border-t border-border/50 sm:justify-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all h-8"
          >
            Dismiss Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    rose:    "text-rose-500 bg-rose-500/10 border-rose-500/20",
    blue:    "text-blue-500 bg-blue-500/10 border-blue-500/20",
    orange:  "text-orange-500 bg-orange-500/10 border-orange-500/20",
    indigo:  "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    slate:   "text-slate-500 bg-slate-500/10 border-slate-500/20",
  }
  return (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border rounded-md px-2.5 py-1.5 w-fit ${colorMap[color] || colorMap.slate}`}>
      <Icon className="size-3" />
      {label}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <HardDriveIcon className="size-10 text-muted-foreground/20 mb-3 animate-pulse" />
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
        Empty snapshot detected.<br />
        <span className="text-[10px] opacity-60 italic font-medium">{message}</span>
      </p>
    </div>
  )
}
