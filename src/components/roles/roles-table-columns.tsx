"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  ShieldIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  LayersIcon,
  ShieldCheckIcon
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Button } from "@/components/ui/button"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { format } from "date-fns"

export function getRolesColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  onAssignPermission,
  capabilities
}: {
  onEdit: (role: any) => void
  onDelete: (role: any) => void
  onToggleStatus: (role: any) => void
  onAssignPermission: (role: any) => void
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
    canAssignPermission: boolean
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
      meta: { title: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const role = row.original
        return (
          <span className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {role.name}
          </span>
        )
      },
    },
    {
      accessorKey: "description",
      size: 350,
      meta: { title: "Description" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return (
          <span className="text-[0.85rem] text-muted-foreground font-medium italic line-clamp-1 max-w-[300px] transition-all">
            {description || "No description"}
          </span>
        )
      },
    },
    {
      id: "parent",
      size: 200,
      accessorKey: "parent.name",
      meta: { title: "Parent Role" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Parent Role" />
      ),
      cell: ({ row }) => {
        const role = row.original
        if (!role.parent) return <Badge variant="secondary" className="text-[9px] uppercase tracking-widest font-black opacity-30 px-2 py-0">Root</Badge>

        return (
          <div className="flex items-center gap-2">
            <LayersIcon className="size-3.5 text-muted-foreground/50 transition-all" />
            <span className="text-[0.85rem] font-bold text-foreground/80 transition-all">{role.parent.name}</span>
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
        const role = row.original
        if (!capabilities.canToggle) {
          return (
             <StatusIndicator 
               isActive={role.isActive} 
               variant="badge" 
               activeLabel="Active" 
               inactiveLabel="Inactive" 
             />
          )
        }

        const isSuperAdmin = role.slug === 'super-admin'

        if (isSuperAdmin) {
          return (
            <div className="flex items-center gap-3">
               {/* Super admin status cannot be toggled */}
               <StatusIndicator 
                 isActive={role.isActive} 
                 variant="badge" 
                 activeLabel="Active" 
                 inactiveLabel="Inactive" 
               />
            </div>
          )
        }

        return (
          <StatusIndicator 
             isActive={role.isActive} 
             onToggle={() => onToggleStatus(role)} 
             activeLabel="Active" 
             inactiveLabel="Inactive" 
             variant="switch" 
          />
        )
      },
    },
    {
      accessorKey: "createdAt",
      size: 180,
      meta: { title: "Created" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = Number(row.original.createdAt)
        return (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            {format(date, "MMM dd, yyyy")}
          </span>
        )
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const role = row.original
        if (!role.isManageable) return null

        const hasAnyAction = capabilities.canUpdate || capabilities.canDelete

        if (!hasAnyAction) return null

        const actions = [
          ...(capabilities.canUpdate ? [{
            label: "Edit",
            onClick: () => onEdit(role)
          }] : []),
          ...(capabilities.canAssignPermission ? [{
            label: "Permissions",
            onClick: () => onAssignPermission(role)
          }] : []),
          ...(capabilities.canToggle && role.slug !== 'super-admin' ? [{
            label: role.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(role)
          }] : []),
          ...(capabilities.canDelete && role.slug !== 'super-admin' ? [{
            label: "Delete",
            onClick: () => onDelete(role),
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
