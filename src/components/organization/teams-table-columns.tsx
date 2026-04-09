"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { 
  Building2, 
  MoreHorizontal, 
  Trash2, 
  Pencil,
  PlusCircle,
  ToggleLeft,
  Users2
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

export interface OrganisationTeamCapabilities {
  canUpdate: boolean
  canDelete: boolean
  canToggle: boolean
  canViewTeamMembers: boolean
}

interface GetColumnsProps {
  capabilities: OrganisationTeamCapabilities
  onEdit: (team: any) => void
  onDelete: (team: any) => void
  onToggleStatus: (team: any) => void
  onViewMembers: (team: any) => void
}

export function getOrganisationTeamColumns({
  capabilities,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewMembers,
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
      accessorKey: "name",
      id: "Team",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => {
        const team = row.original
        return (
          <div className="flex flex-col">
            <span className="text-sm font-black text-foreground tracking-tight uppercase line-clamp-1">
              {team.name}
            </span>
          </div>
        )
      },
    },
    {
        id: "Members",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Members" />
        ),
      cell: ({ row }) => {
        const count = row.original._count?.members || 0
        return (
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest whitespace-nowrap">
            {count}
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
        const team = row.original
        
        return (
          <StatusIndicator 
             isActive={isActive}
             onToggle={() => onToggleStatus(team)}
             activeLabel="Active"
             inactiveLabel="Inactive"
             variant="switch"
             disabled={!capabilities.canToggle}
          />
        )
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
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
            {format(new Date(Number(date)), "MMM dd, yyyy")}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original

        const actions = []

        if (capabilities.canUpdate) {
          actions.push({
            label: "Edit",
            onClick: () => onEdit(team)
          })
        }
        if (capabilities.canToggle) {
          actions.push({
            label: team.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(team)
          })
        }
        if (capabilities.canViewTeamMembers) {
          actions.push({
            label: "View Members",
            onClick: () => onViewMembers(team)
          })
        }

        if (capabilities.canDelete) {
          actions.push({
            label: "Delete",
            onClick: () => onDelete(team),
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
