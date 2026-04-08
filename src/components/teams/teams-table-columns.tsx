"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  UsersIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  ShieldIcon,
  InfoIcon,
  TimerIcon,
  ActivityIcon
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Button } from "@/components/ui/button"
import { StatusIndicator } from "@/components/ui/status-indicator"

export function getTeamsColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  onManageMembers,
  capabilities
}: {
  onEdit: (team: any) => void
  onDelete: (team: any) => void
  onToggleStatus: (team: any) => void
  onManageMembers: (team: any) => void
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
  }
}): ColumnDef<any>[] {
  return [
    {
      id: "select",
      size: 50,
      header: ({ table }) => (
        <div className="flex items-center justify-center w-8">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px] border-input"
          />
        </div>
      ),
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const serialNumber = (pageIndex * pageSize) + row.index + 1
        const isSelected = row.getIsSelected()

        return (
          <div className="group flex items-center justify-center w-8 h-8 relative">
            {!isSelected && (
              <span className="text-[0.75rem] font-mono font-bold text-muted-foreground group-hover:hidden transition-all duration-200">
                {String(serialNumber).padStart(2, '0')}
              </span>
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className={`border-input transition-all duration-200 ${isSelected ? 'scale-110 shadow-[0_0_10px_rgba(var(--primary),0.2)]' : 'hidden group-hover:block'}`}
            />
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      size: 250,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const team = row.original
        return (
          <div className="flex flex-col gap-0 py-1">
             <span className="font-bold text-foreground group-hover:text-primary transition-colors text-[0.95rem] transition-all">{team.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      size: 350,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return (
          <div className="flex items-start gap-2 max-w-[300px] transition-all">
             <span className="text-[0.85rem] text-muted-foreground font-medium italic line-clamp-2">
                {description || "No description provided"}
             </span>
          </div>
        )
      },
    },
    {
      id: "members",
      size: 100,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" className="justify-center" />
      ),
      cell: ({ row }) => {
        const team = row.original
        return (
          <div className="flex justify-center w-full">
            <span className="text-[0.75rem] font-mono font-bold text-primary transition-all">
              {team._count?.members || 0}
            </span>
          </div>
        )
      },
    },
    {
      id: "roles",
      size: 100,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Roles" className="justify-center" />
      ),
      cell: ({ row }) => {
        const team = row.original
        return (
          <div className="flex justify-center w-full">
            <span className="text-[0.75rem] font-mono font-bold text-primary transition-all">
              {team._count?.roles || 0}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      size: 150,
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const team = row.original
        
        return (
          <StatusIndicator 
             isActive={team.isActive} 
             onToggle={() => onToggleStatus(team)} 
             activeLabel="Active" 
             inactiveLabel="Suspended" 
             variant="switch" 
             disabled={!capabilities.canToggle}
          />
        )
      },
    },
    {
      accessorKey: "createdAt",
        size: 150,
        meta: { title: "Created" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => {
          const date = new Date(Number(row.getValue("createdAt")))
          return (
            <div className="flex items-center gap-2">
              <span className="text-[0.8rem] font-mono font-bold text-muted-foreground transition-all">
                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )
        },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const team = row.original
        const hasAnyAction = capabilities.canUpdate || capabilities.canDelete

        if (!hasAnyAction) return null

        const actions = [
          ...(capabilities.canUpdate ? [
            {
              label: "Edit",
              onClick: () => onEdit(team)
            },
            {
              label: "Members",
              onClick: () => onManageMembers(team)
            }
          ] : []),
          ...(capabilities.canToggle ? [{
            label: team.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(team)
          }] : []),
          ...(capabilities.canDelete ? [{
            label: "Delete",
            onClick: () => onDelete(team),
            variant: "destructive" as const
          }] : [])
        ]

        return (
          <div className="flex justify-end pr-4">
            <DataTableRowActions actions={actions} />
          </div>
        )
      },
    },
  ]
}
