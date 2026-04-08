"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { 
  MoreHorizontal, 
  Trash2,
  User
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
import { format } from "date-fns"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { ToggleLeft } from "lucide-react"

interface GetColumnsProps {
  canManage: boolean
  onRemove: (member: any) => void
  onToggleStatus: (member: any) => void
}

export function getOrganisationTeamMemberColumns({
  canManage,
  onRemove,
  onToggleStatus,
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
      accessorKey: "user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="flex items-center gap-3">
             <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border">
                {user.image ? (
                    <img src={user.image} alt={user.name} className="size-8 rounded-full object-cover" />
                ) : (
                    <User className="size-4 text-muted-foreground" />
                )}
             </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-foreground tracking-tight uppercase line-clamp-1">
                {user.name}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest leading-none mt-1">
                {user.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned At" />
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
             disabled={!canManage}
          />
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original

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
                {canManage && (
                  <DropdownMenuItem onClick={() => onToggleStatus(member)} className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 group">
                    <ToggleLeft className="size-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    Status
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {canManage && (
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => onRemove(member)} 
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider py-2 text-destructive focus:bg-destructive/10 focus:text-destructive group"
                  >
                    <Trash2 className="size-3.5 group-hover:scale-110 transition-transform" />
                    Remove from Team
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
