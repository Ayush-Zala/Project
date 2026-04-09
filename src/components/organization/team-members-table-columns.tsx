"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import {
  Trash2,
  Mail,
  ToggleLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"

interface GetColumnsProps {
  capabilities: {
    canDelete: boolean
    canToggle: boolean
  }
  onRemove: (member: any) => void
  onToggleStatus: (member: any) => void
}

export function getOrganisationTeamMemberColumns({
  capabilities,
  onRemove,
  onToggleStatus,
}: GetColumnsProps): ColumnDef<any>[] {
  const canPerformBulk = capabilities.canToggle || capabilities.canDelete;
  return [
    {
      id: "select",
      header: ({ table }) => (
        canPerformBulk ? (
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
      id: "Member",
      accessorKey: "user",
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
              <span className="text-[11px] font-medium leading-none font-mono">
                {user.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: "Status",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = !!row.original.isActive
        const member = row.original

        return (
          <StatusIndicator
            isActive={isActive}
            onToggle={() => onToggleStatus(member)}
            activeLabel="Active"
            inactiveLabel="Inactive"
            variant="switch"
            disabled={!capabilities.canToggle}
          />
        )
      },
    },
    {
      id: "Assigned",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned" />
      ),
      cell: ({ row }) => {
        const date = Number(row.original.createdAt)
        return (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {format(date, "MMM dd, yyyy")}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original

        const actions = []

        if (capabilities.canToggle) {
          actions.push({
            label: member.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(member)
          })
        }
        if (capabilities.canDelete) {
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
