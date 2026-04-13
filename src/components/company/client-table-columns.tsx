"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { 
  Globe, 
  Share2,
  Link as LinkIcon,
  Music2
} from "lucide-react"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Badge } from "@/components/ui/badge"

interface GetColumnsProps {
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
  }
  onEdit: (client: any) => void
  onDelete: (client: any) => void
  onToggleStatus: (client: any) => void
}

export function getClientColumns({
  capabilities,
  onEdit,
  onDelete,
  onToggleStatus,
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
              <span className="text-[10px] font-black text-muted-foreground/40 group-hover:hidden transition-all duration-200 uppercase tracking-tighter">
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
      accessorKey: "fullName",
      meta: { title: "Client Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Client Name" />
      ),
      cell: ({ row }) => {
        const client = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground tracking-tight uppercase line-clamp-1">
              {client.fullName}
            </span>
            {client.designation && (
              <span className="text-[10px] font-semibold text-muted-foreground/95 lowercase tracking-tight">
                {client.designation}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "company.name",
      meta: { title: "Company" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const companyName = row.original.company?.name || "Unassigned"
        return (
           <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-tight line-clamp-1">
                {companyName}
              </span>
           </div>
        )
      },
    },
    {
      id: "contacts",
      meta: { title: "Contact" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => {
        const primaryContact = row.original.contacts?.find((c: any) => c.isPrimary) || row.original.contacts?.[0]
        if (!primaryContact) return <span className="text-[10px] text-muted-foreground/30 italic uppercase">No Contact</span>
        
        return (
          <div className="flex flex-col gap-0.5">
             <span className="text-[11px] font-semibold text-foreground/80 tracking-tighter line-clamp-1">
                {primaryContact.value}
             </span>
             <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                {primaryContact.type === "OTHER" && primaryContact.otherType 
                  ? primaryContact.otherType 
                  : primaryContact.type.replace("_", " ")}
             </span>
          </div>
        )
      },
    },
    {
      id: "socials",
      meta: { title: "Socials" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Socials" justify="center" />
      ),
      cell: ({ row }) => {
        const socials = row.original.socials || []
        if (socials.length === 0) return <div className="flex justify-center"><span className="text-[10px] text-muted-foreground/20 italic">-</span></div>
        
        const platformIcons: Record<string, any> = {
          LINKEDIN: Globe,
          TWITTER_X: Share2,
          FACEBOOK: Share2,
          INSTAGRAM: Share2,
          YOUTUBE: Share2,
          TIKTOK: Music2,
          GITHUB: Globe,
          GITLAB: Globe,
          WEBSITE: Globe,
          BLOG: Share2,
          OTHER: LinkIcon,
        }

        return (
          <div className="flex justify-center items-center gap-1.5">
            {socials.map((s: any, i: number) => {
              const Icon = platformIcons[s.platform] || LinkIcon
              return (
                <a 
                  key={i} 
                  href={s.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md hover:bg-primary/5 text-muted-foreground/40 hover:text-primary transition-all active:scale-95"
                  title={s.platform === "OTHER" && s.otherPlatform 
                    ? s.otherPlatform 
                    : s.platform.replace("_", " ")}
                >
                  <Icon className="size-3.5" />
                </a>
              )
            })}
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
        const client = row.original
        
        return (
          <StatusIndicator 
             isActive={isActive}
             onToggle={() => onToggleStatus(client)}
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {formattedDate}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original
        
        const actions = [];

        if (capabilities.canUpdate) {
          actions.push({
            label: "Edit",
            onClick: () => onEdit(client)
          });
        }

        if (capabilities.canToggle) {
          actions.push({
            label: client.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(client)
          });
        }

        if (capabilities.canDelete) {
          actions.push({
            label: "Delete",
            onClick: () => onDelete(client),
            variant: "destructive" as const
          });
        }

        return (
          <div className="flex justify-end pr-4 opacity-40 hover:opacity-100 transition-opacity">
            <DataTableRowActions actions={actions} />
          </div>
        )
      },
    },
  ]
}
