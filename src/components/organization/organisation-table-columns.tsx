"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Button } from "@/components/ui/button"
import { StatusIndicator } from "@/components/ui/status-indicator"

import { format } from "date-fns"

interface GetColumnsProps {
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
    canViewMembers: boolean
    canViewTeams: boolean
  }
  onEdit: (org: any) => void
  onDelete: (org: any) => void
  onToggleStatus: (org: any) => void
  onViewWorkspace: (org: any) => void
}

export function getOrganisationColumns({
  capabilities,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewWorkspace,
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
      accessorKey: "name",
      meta: { title: "Organization" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Organization" />
      ),
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="flex items-center gap-3">
             <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
                {org.logo ? (
                    <img src={org.logo} alt={org.name} className="size-8 rounded-lg object-cover" />
                ) : (
                    <span className="text-[10px] font-black text-muted-foreground/40">{org.name.charAt(0).toUpperCase()}</span>
                )}
             </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground tracking-tight uppercase line-clamp-1">
                  {org.name}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      meta: { title: "Description" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const description = row.getValue("description") as string || "No description provided"
        return (
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest line-clamp-1 max-w-[200px]">
            {description}
          </span>
        )
      },
    },
    {
      id: "membersCount",
      meta: { title: "Members" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" justify="center" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.members || 0
        return (
          <div className="flex justify-center">
            <span className="text-[11px] font-black font-mono text-muted-foreground/70 transition-colors group-hover:text-primary">
              {count}
            </span>
          </div>
        )
      },
    },
    {
      id: "teamsCount",
      meta: { title: "Teams" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Teams" justify="center" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.teams || 0
        return (
          <div className="flex justify-center">
            <span className="text-[11px] font-black font-mono text-muted-foreground/70 transition-colors group-hover:text-primary">
              {count}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = !!row.getValue("isActive")
        const org = row.original
        
        return (
          <StatusIndicator 
             isActive={isActive}
             onToggle={() => onToggleStatus(org)}
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
      meta: { title: "Created" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = new Date(Number(row.original.createdAt))
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }).format(date)

        return (
          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground/60 transition-colors group-hover:text-foreground/80">
            {formattedDate}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const org = row.original
        
        const actions = [];

        if (capabilities.canViewMembers || capabilities.canViewTeams) {
          actions.push({
            label: "View Workspace",
            onClick: () => onViewWorkspace(org)
          });
        }

        if (capabilities.canUpdate) {
          actions.push({
            label: "Edit",
            onClick: () => onEdit(org)
          });
        }

        if (capabilities.canToggle) {
          actions.push({
            label: org.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(org)
          });
        }

        if (capabilities.canDelete) {
          actions.push({
            label: "Delete",
            onClick: () => onDelete(org),
            variant: "destructive" as const
          });
        }

        return (
          <div className="flex justify-end pr-4 transition-all opacity-40 hover:opacity-100">
            <DataTableRowActions actions={actions} />
          </div>
        )
      },
    },
  ]
}
