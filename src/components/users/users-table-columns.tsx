"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { 
  ShieldCheckIcon,
  SearchIcon,
  MoreVerticalIcon,
  PencilIcon,
  ShieldIcon,
  KeyIcon,
  Trash2Icon
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Button } from "@/components/ui/button"

export function getUsersColumns({
  onEdit,
  onDelete,
  onPasswordReset,
  onRoleChange,
  onDirectPermissions,
  onToggleStatus,
  capabilities
}: {
  onEdit: (user: any) => void
  onDelete: (user: any) => void
  onPasswordReset: (user: any) => void
  onRoleChange: (user: any) => void
  onDirectPermissions: (user: any) => void
  onToggleStatus: (user: any) => void
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
    canAssignRole: boolean
    canAssignPermission: boolean
  }
}): ColumnDef<any>[] {
  const columns: ColumnDef<any>[] = [
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
      meta: { title: "User" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex flex-col gap-0 py-1">
             <span className="font-bold text-foreground group-hover:text-primary transition-all text-[0.95rem] tracking-tight">{user.name}</span>
             <span className="text-[0.8rem] text-muted-foreground flex items-center gap-1.5 font-medium tracking-tight transition-all">
                <span className="opacity-40">✉</span> {user.email}
             </span>
          </div>
        )
      },
    },
    {
      id: "userRoles",
      accessorKey: "role.name",
      size: 200,
      meta: { title: "Role" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const user = row.original
        if (!user.role) return <span className="text-[0.8rem] text-muted-foreground italic transition-all">No role assigned</span>
        
        return (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="font-medium text-[0.75rem] uppercase tracking-wide px-2 py-0.5 border-primary/20 text-primary bg-primary/5 shadow-sm transition-all"
            >
              <ShieldCheckIcon className="h-2.5 w-2.5 mr-1" />
              {user.role.name}
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
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
        const user = row.original
        if (!capabilities.canToggle) {
          return (
             <StatusIndicator 
               isActive={user.isActive} 
               variant="badge" 
               activeLabel="Active" 
               inactiveLabel="Inactive" 
             />
          )
        }
        
        return (
          <div className="flex items-center gap-3">
            {user.isToggleable ? (
              <StatusIndicator 
                isActive={user.isActive} 
                onToggle={() => onToggleStatus(user)} 
                activeLabel="Active" 
                inactiveLabel="Inactive" 
                variant="switch" 
              />
            ) : (
              <StatusIndicator 
                isActive={user.isActive} 
                variant="badge" 
                activeLabel="Active" 
                inactiveLabel="Inactive" 
              />
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const user = row.original
        if (!user.isToggleable) return null
        
        const hasAnyAction = capabilities.canUpdate || capabilities.canAssignRole || capabilities.canAssignPermission || capabilities.canDelete
        
        if (!hasAnyAction) return null

        const actions = [
          ...(capabilities.canUpdate ? [{
            label: "Edit",
            onClick: () => onEdit(user)
          }] : []),
          ...(capabilities.canAssignRole ? [{
            label: "Roles",
            onClick: () => onRoleChange(user)
          }] : []),
          ...(capabilities.canUpdate ? [{
            label: "Security",
            onClick: () => onPasswordReset(user)
          }] : []),
          ...(capabilities.canAssignPermission ? [{
            label: "Permissions",
            onClick: () => onDirectPermissions(user)
          }] : []),
          ...(capabilities.canDelete ? [{
            label: "Delete",
            onClick: () => onDelete(user),
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

  return columns
}
