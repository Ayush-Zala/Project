"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

export interface OrganisationTeamCapabilities {
  canUpdate: boolean
  canDelete: boolean
  canManage: boolean
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
        id: "membersCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Members" />
        ),
      cell: ({ row }) => {
        const count = row.original._count?.members || 0
        return (
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest whitespace-nowrap">
            {count} Members
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
        const team = row.original
        
        return (
          <StatusIndicator 
             isActive={isActive}
             onToggle={() => onToggleStatus(team)}
             activeLabel="Active"
             inactiveLabel="Inactive"
             variant="switch"
             disabled={!capabilities.canManage}
          />
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original

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
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-2 py-1.5">
                  Actions
                </DropdownMenuLabel>
                {capabilities.canManage && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(team)} className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 group">
                      <Pencil className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(team)} className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 group">
                      <ToggleLeft className="size-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                      Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewMembers(team)} className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 group">
                      <Users2 className="size-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                      View Members
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {capabilities.canDelete && (
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => onDelete(team)} 
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 text-destructive focus:bg-destructive/10 focus:text-destructive group"
                  >
                    <Trash2 className="size-3.5 group-hover:scale-110 transition-transform" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
