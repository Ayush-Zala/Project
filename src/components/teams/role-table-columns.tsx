"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  PencilIcon,
  Trash2Icon,
  ShieldIcon
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { StatusIndicator } from "@/components/ui/status-indicator"

export function getRoleColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  capabilities,
  isTeamActive
}: {
  onEdit: (role: any) => void
  onDelete: (role: any) => void
  onToggleStatus: (role: any) => void
  isTeamActive: boolean
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role Name" />
      ),
      meta: { title: "Role Name" },
      cell: ({ row }) => {
        const role = row.original
        return (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="font-bold text-foreground group-hover:text-primary transition-colors text-[0.95rem]">{role.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      meta: { title: "Description" },
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return (
          <div className="flex items-start gap-2 max-w-[300px] transition-all py-1">
             <span className="text-[0.85rem] text-muted-foreground font-medium italic line-clamp-1">
                {description || "No description specified"}
             </span>
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      meta: { title: "Status" },
      cell: ({ row }) => {
        const role = row.original
        return (
          <StatusIndicator 
             isActive={role.isActive} 
             onToggle={() => onToggleStatus(role)} 
             activeLabel="Active" 
             inactiveLabel="Suspended" 
             variant="switch" 
             disabled={!capabilities.canToggle || !isTeamActive}
          />
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      meta: { title: "Created" },
      cell: ({ row }) => {
        const date = new Date(Number(row.getValue("createdAt")))
        return (
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const role = row.original
        if (!isTeamActive || !role.isActive) return null

        const actions = [
          ...(capabilities.canUpdate ? [{
            label: "Edit",
            onClick: () => onEdit(role),
            icon: PencilIcon
          }] : []),
          ...(capabilities.canToggle ? [{
            label: role.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(role)
          }] : []),
          ...(capabilities.canDelete ? [{
            label: "Delete",
            onClick: () => onDelete(role),
            variant: "destructive" as const,
            icon: Trash2Icon
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
