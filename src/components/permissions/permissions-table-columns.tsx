"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  KeyIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  ShieldIcon,
  CpuIcon,
  ActivityIcon
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { StatusIndicator } from "@/components/ui/status-indicator"

export function getPermissionsColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  capabilities
}: {
  onEdit: (permission: any) => void
  onDelete: (permission: any) => void
  onToggleStatus: (permission: any) => void
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle?: boolean
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
        const permission = row.original
        return (
          <span className="font-bold text-foreground group-hover:text-primary transition-colors text-[0.95rem]">
             {permission.name}
          </span>
        )
      },
    },
    {
      accessorKey: "slug",
      size: 300,
      meta: { title: "Code" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => {
        const slug = row.getValue("slug") as string
        return (
          <Badge variant="secondary" className="font-mono text-[0.8rem] bg-background/50 border-input text-foreground/80 px-2 py-0.5 shadow-sm transition-all">
            {slug}
          </Badge>
        )
      },
    },
    {
      accessorKey: "resource",
      size: 150,
      meta: { title: "Resource" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resource" />
      ),
      cell: ({ row }) => {
        const resource = row.getValue("resource") as string
        return (
          <div className="flex items-center gap-2">
             <span className="text-[0.85rem] font-bold text-foreground/70 uppercase tracking-wider transition-all">{resource}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "action",
      size: 150,
      meta: { title: "Action" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Action" />
      ),
      cell: ({ row }) => {
        const action = row.getValue("action") as string
        return (
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="text-[0.75rem] uppercase tracking-wide font-medium border-transparent text-primary bg-primary/5 px-2 py-0.5 transition-all">
                {action}
             </Badge>
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
        const permission = row.original
        const isActive = row.getValue("isActive") as boolean

        if (capabilities.canToggle === false) {
           return (
              <StatusIndicator 
                isActive={isActive} 
                variant="dot" 
                activeLabel="Active" 
                inactiveLabel="Archived" 
              />
           )
        }

        return (
          <StatusIndicator 
             isActive={isActive} 
             onToggle={() => onToggleStatus(permission)} 
             activeLabel="Active" 
             inactiveLabel="Archived" 
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
        const createdAt = row.getValue("createdAt")
        if (!createdAt) return <span className="text-muted-foreground/30">—</span>
        
        const date = new Date(Number(createdAt))
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric"
        }).format(date)

        return (
          <div className="flex flex-col">
            <span className="text-[0.75rem] font-black font-mono tracking-tight text-foreground/80">
              {formattedDate}
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const permission = row.original
        const hasAnyAction = capabilities.canUpdate || capabilities.canDelete

        if (!hasAnyAction) return null

        const actions = [
          ...(capabilities.canUpdate ? [{
            label: "Edit",
            onClick: () => onEdit(permission)
          }] : []),
          ...(capabilities.canToggle !== false ? [{
            label: permission.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(permission)
          }] : []),
          ...(capabilities.canDelete ? [{
            label: "Delete",
            onClick: () => onDelete(permission),
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
