"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  MoreVerticalIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { Switch } from "@/components/ui/switch"

export function getMemberColumns({
  onAssignRole,
  onRemove,
  onToggleStatus,
  capabilities,
  isTeamActive
}: {
  onAssignRole: (member: any) => void
  onRemove: (member: any) => void
  onToggleStatus: (member: any) => void
  isTeamActive: boolean
  capabilities: {
    canDelete: boolean
    canToggle: boolean
    canAssignRole: boolean
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
      accessorKey: "user.name",
      id: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team Member" />
      ),
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center gap-4 py-1">
            <div className="relative group/avatar">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xs uppercase">
                {member.user?.name?.charAt(0)}
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <span className="font-bold text-foreground group-hover:text-primary transition-colors text-[0.9rem] line-clamp-1">{member.user?.name}</span>
              <span className="text-[10px] text-muted-foreground tracking-tight font-medium uppercase line-clamp-1">{member.user?.email}</span>
            </div>
          </div>
        )
      },
    },
    {
      id: "roles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Roles" />
      ),
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex flex-wrap gap-1.5">
            {member.roles?.length > 0 ? (
              member.roles.map((mr: any, index: number) => (
                <div key={mr.role.id} className="flex items-center">
                  <span 
                    className={`font-bold text-[10px] uppercase tracking-widest text-primary/70 ${!mr.role.isActive ? 'line-through opacity-50' : ''}`}
                  >
                    {mr.role.name}
                  </span>
                  {index < member.roles.length - 1 && (
                    <span className="text-muted-foreground/40 font-bold mx-1">,</span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground italic">No roles assigned</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Membership" />
      ),
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center gap-3">
            <Switch
              disabled={!capabilities.canToggle || !isTeamActive}
              checked={member.isActive}
              onCheckedChange={() => onToggleStatus(member)}
            />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${member.isActive ? 'text-primary' : 'text-muted-foreground/60'}`}>
              {member.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const member = row.original
        const canDelete = capabilities.canDelete
        const canAssign = capabilities.canAssignRole
        
        if (!isTeamActive || !member.isActive) return null
        if (!canDelete && !canAssign) return null

        const actions = [
          ...(canAssign ? [{
            label: "Assign Team Role",
            onClick: () => onAssignRole(member),
            icon: ShieldIcon
          }] : []),
          ...(canDelete ? [{
            label: "Remove from Team",
            onClick: () => onRemove(member),
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
