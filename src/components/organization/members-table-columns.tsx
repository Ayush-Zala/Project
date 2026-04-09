"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { 
  Building2, 
  MoreHorizontal, 
  ShieldCheck, 
  Pencil, 
  Trash2,
  CheckCircle2,
  XCircle,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"

export interface OrganisationMemberCapabilities {
  canDelete: boolean
  canToggle: boolean
}

interface GetColumnsProps {
  capabilities: OrganisationMemberCapabilities
  onEdit: (member: any) => void
  onRemove: (member: any) => void
  onToggleStatus: (member: any) => void
}

export function getOrganisationMemberColumns({
  capabilities,
  onEdit,
  onRemove,
  onToggleStatus,
}: GetColumnsProps): ColumnDef<any>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        (capabilities.canToggle || capabilities.canDelete) ? (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        ) : null
      ),
      cell: ({ row, table }) => {
        const isSelected = row.getIsSelected()
        const { pageIndex, pageSize } = table.getState().pagination
        const serialNumber = (pageIndex * pageSize) + row.index + 1

        const canPerformBulk = capabilities.canToggle || capabilities.canDelete;

        return (
          <div className="group flex items-center justify-center w-8 h-8 relative">
            {(!isSelected || !canPerformBulk) && (
              <span className="text-[10px] font-mono font-black text-muted-foreground/40 group-hover:hidden transition-all duration-200 uppercase tracking-tighter">
                {String(serialNumber).padStart(2, '0')}
              </span>
            )}
            {canPerformBulk && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className={`translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200 ${isSelected ? 'scale-110 shadow-lg shadow-primary/20' : 'hidden group-hover:block'}`}
              />
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user",
      id: "Member",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="flex flex-col py-1">
            <span className="text-sm font-bold text-foreground tracking-tight leading-none mb-1">
              {user.name}
            </span>
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <Mail className="size-3 text-muted-foreground/40" />
              <span className="text-[11px] font-medium leading-none">
                {user.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "role",
      id: "Role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const role = row.getValue("Role") as string
        return (
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground">
            {role}
          </span>
        )
      },
    },
    {
      accessorKey: "isActive",
      id: "Status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = !!row.getValue("Status")
        const member = row.original
        const isOwner = member.role?.toLowerCase() === "owner"
        
        if (isOwner) {
          return (
            <StatusIndicator 
               isActive={isActive}
               activeLabel="Active"
               inactiveLabel="Suspended"
               variant="badge"
            />
          )
        }

        return (
          <StatusIndicator 
             isActive={isActive}
             onToggle={() => onToggleStatus(member)}
             activeLabel="Active"
             inactiveLabel="Suspended"
             variant="switch"
             disabled={!capabilities.canToggle}
          />
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
    },
    {
      accessorKey: "createdAt",
      id: "Created",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("Created")
        if (!date) return <span className="text-[10px] text-muted-foreground/30 font-bold uppercase">N/A</span>
        
        return (
          <div className="flex flex-col">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {format(new Date(Number(date)), "MMM dd, yyyy")}
             </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        const isOwner = member.role?.toLowerCase() === "owner"

        const actions = []

        if (capabilities.canToggle && !isOwner) {
          actions.push({
            label: member.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(member)
          })
        }

        if (capabilities.canDelete && !isOwner) {
          actions.push({
            label: "Delete",
            onClick: () => onRemove(member),
            variant: "destructive" as const
          })
        }

        return (
          <div className="flex justify-end transition-all opacity-40 hover:opacity-100 pr-2">
            <DataTableRowActions actions={actions} />
          </div>
        )
      },
    },
  ]
}
