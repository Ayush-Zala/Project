"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusIndicator } from "@/components/ui/status-indicator"

import { format } from "date-fns"

interface GetColumnsProps {
  onEdit: (org: any) => void
  onDelete: (org: any) => void
  onToggleStatus: (org: any) => void
  onViewWorkspace: (org: any) => void
}

export function getOrganisationColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  onViewWorkspace,
}: GetColumnsProps): ColumnDef<any>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      cell: ({ row, table }) => {
        const isSelected = row.getIsSelected()
        const { pageIndex, pageSize } = table.getState().pagination
        const serialNumber = (pageIndex * pageSize) + row.index + 1

        return (
          <div className="group flex items-center justify-center w-8 h-8 relative">
            {!isSelected && (
              <span className="text-[10px] font-mono font-black text-muted-foreground/40 group-hover:hidden transition-all duration-200 uppercase tracking-tighter">
                {String(serialNumber).padStart(2, '0')}
              </span>
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className={`translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200 ${isSelected ? 'scale-110 shadow-lg shadow-primary/20' : 'hidden group-hover:block'}`}
            />
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
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
              <span className="text-sm font-black text-foreground tracking-tight uppercase line-clamp-1">
                {org.name}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.members || 0
        return (
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest leading-none">
            {count} Members
          </span>
        )
      },
    },
    {
      id: "teamsCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Teams" />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.teams || 0
        return (
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest leading-none">
            {count} Teams
          </span>
        )
      },
    },
    {
      accessorKey: "isActive",
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
          />
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
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
        const org = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                className="flex h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border/40 shadow-2xl">
              <DropdownMenuItem 
                onClick={() => onViewWorkspace(org)}
                className="font-bold text-[10px] uppercase tracking-wider py-2 cursor-pointer"
              >
                View Workspace
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onEdit(org)} 
                className="font-bold text-[10px] uppercase tracking-wider py-2 cursor-pointer"
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(org)} 
                className="font-bold text-[10px] uppercase tracking-wider py-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
