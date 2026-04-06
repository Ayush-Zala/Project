"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { 
  HistoryIcon, 
  UserIcon, 
  ActivityIcon, 
  TerminalIcon,
  ShieldCheckIcon,
  SearchIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

export interface AuditLogWithUser {
  id: number;
  userId: number | null;
  action: string;
  resource: string;
  metaData: any;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  reason: string | null;
  createdAt: number;
  user: {
    name: string;
    email: string;
    image: string | null;
  } | null;
  createdByUser: {
    name: string;
    email: string;
    image: string | null;
  } | null;
}

interface ColumnOptions {
  onViewDiff: (log: AuditLogWithUser) => void;
}

export function getAuditColumns({ onViewDiff }: ColumnOptions): ColumnDef<AuditLogWithUser>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => {
        const date = new Date(Number(row.getValue("createdAt")))
        return (
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-foreground font-mono">
              {format(date, "dd-MM-yyyy")}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono italic">
              {format(date, "HH:mm:ss")}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const actor = row.original.createdByUser
        let isSystem = false;
        
        // Fallback for older logs or system actions
        if (!actor) {
           isSystem = true;
        }

        if (isSystem) return <Badge variant="outline" className="text-[9px] uppercase tracking-tighter opacity-50">System</Badge>
        
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 border border-border/50">
              <AvatarImage src={actor?.image || ""} />
              <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                {actor?.name?.charAt(0) || <UserIcon className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate max-w-[120px]">
              <span className="text-[11px] font-bold truncate leading-none mb-0.5">{actor?.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{actor?.email}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "action",
      header: "Activity",
      cell: ({ row }) => {
        const action = row.getValue("action") as string
        const status = row.original.status as string

        if (status === "FAILURE") {
          return <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground line-through">FAILED</span>
        }

        return (
          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
            {action}
          </span>
        )
      },
    },
    {
      accessorKey: "resource",
      header: "Location",
      cell: ({ row }) => {
        const resource = row.getValue("resource") as string
        const targetUser = row.original.user

        return (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-tight text-foreground/80 lowercase italic font-mono">
              {resource}
            </span>
            {targetUser && (
               <div className="flex items-center gap-1 opacity-70">
                  <UserIcon className="size-3" />
                  <span className="text-[9px] font-bold">{targetUser.name}</span>
               </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "reason",
      header: "Description",
      cell: ({ row }) => {
        const reason = row.original.reason || "Operational update"
        const metaData = row.original.metaData
        return (
          <div className="flex items-center justify-between gap-4 max-w-[300px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="text-[11px] text-muted-foreground line-clamp-1 italic cursor-help truncate block" />}>
                  {reason}
                </TooltipTrigger>
                <TooltipContent className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl p-3 rounded-lg max-w-[380px]">
                  <div className="flex flex-col gap-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Activity Details</div>
                    <div className="text-[11px] text-foreground/80 break-all font-mono italic leading-relaxed whitespace-pre-wrap">
                      {reason}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {metaData && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewDiff(row.original)}
                className="h-6 w-6 hover:bg-primary/10 text-primary transition-all active:scale-90 shrink-0"
              >
                <SearchIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },

    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => {
        const ip = row.original.ipAddress || "::1"
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<div className="flex items-center gap-1.5 cursor-help" />}>
                  <TerminalIcon className="size-3 text-muted-foreground/60" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-tighter">
                    {ip}
                  </span>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl p-2 rounded-lg">
                <div className="flex flex-col gap-1">
                   <div className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Device Profile</div>
                   <div className="max-w-[300px] text-[10px] text-muted-foreground break-all font-mono italic leading-relaxed">
                      {row.original.userAgent || "Unknown Device"}
                   </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
  ]
}
