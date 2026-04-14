"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table/data-table-row-actions"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Badge } from "@/components/ui/badge"

interface GetColumnsProps {
  capabilities: {
    canUpdate: boolean
    canDelete: boolean
    canToggle: boolean
    canAssign: boolean
  }
  onEdit: (company: any) => void
  onDelete: (company: any) => void
  onToggleStatus: (company: any) => void
  onShowClients: (company: any) => void
  onView: (company: any) => void
  onAssignMembers: (company: any) => void

}

interface Action {
  label: string
  onClick: () => void
  variant?: "default" | "destructive"
}

export function getCompanyColumns({
  capabilities,
  onEdit,
  onDelete,
  onToggleStatus,
  onShowClients,
  onView,
  onAssignMembers,

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
      accessorKey: "name",
      meta: { title: "Company" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const company = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-black text-foreground tracking-tight uppercase line-clamp-1">
              {company.name}
            </span>
            {company.website && (
              <span className="text-[10px] font-semibold text-muted-foreground/90 lowercase tracking-tight">
                {company.website.replace(/^https?:\/\//, "")}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "industry.name",
      meta: { title: "Industry" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Industry" />
      ),
      cell: ({ row }) => {
        const industryName = row.original.industry?.name || "Unknown"
        return (
          <span className="text-xs font-medium uppercase tracking-tight text-foreground/80">
            {industryName}
          </span>
        )
      },
    },
    {
      accessorKey: "source",
      meta: { title: "Source" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => {
        const company = row.original
        const source = company.source as string
        const displaySource = source === "OTHER" && company.otherSource
          ? company.otherSource
          : source.replace("_", " ")

        return (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[120px]" title={displaySource}>
            {displaySource}
          </span>
        )
      },
    },
    {
      id: "company_phones",
      meta: { title: "Company Phones" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Phones" />
      ),
      cell: ({ row }) => {
        const contacts = row.original.contacts || []
        const phones = contacts
          .filter((c: any) => !c.type?.includes("EMAIL") && !c.value?.includes("@"))
          .sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))

        if (phones.length === 0) return <span className="text-[10px] text-muted-foreground/30 italic uppercase">No Phones</span>

        return (
          <div className="flex flex-col gap-2 py-1">
            {phones.map((contact: any, index: number) => (
              <div key={contact.id} className="flex flex-col gap-0.5 relative group/contact">
                <span className={`text-[11px] font-black text-foreground/80 tracking-tighter line-clamp-1 ${contact.isPrimary ? 'text-primary/90' : ''}`}>
                  {contact.value}
                  {contact.isPrimary && <span className="font-medium text-muted-foreground/60 tracking-normal ml-1">(Primary)</span>}
                </span>
                {index < phones.length - 1 && (
                  <div className="absolute -bottom-1 left-0 w-4 h-[1px] bg-border/30" />
                )}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      id: "company_emails",
      meta: { title: "Company Emails" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Emails" />
      ),
      cell: ({ row }) => {
        const contacts = row.original.contacts || []
        const emails = contacts
          .filter((c: any) => c.type?.includes("EMAIL") || c.value?.includes("@"))
          .sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))

        if (emails.length === 0) return <span className="text-[10px] text-muted-foreground/30 italic uppercase">No Emails</span>

        return (
          <div className="flex flex-col gap-2 py-1">
            {emails.map((contact: any, index: number) => (
              <div key={contact.id} className="flex flex-col gap-0.5 relative group/contact">
                <span className={`text-[11px] font-black text-foreground/80 tracking-tighter line-clamp-1 ${contact.isPrimary ? 'text-primary/90' : ''}`}>
                  {contact.value}
                  {contact.isPrimary && <span className="font-medium text-muted-foreground/60 tracking-normal ml-1">(Primary)</span>}
                </span>
                {index < emails.length - 1 && (
                  <div className="absolute -bottom-1 left-0 w-4 h-[1px] bg-border/30" />
                )}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      id: "assignedTo",
      meta: { title: "Assigned To" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned To" />
      ),
      cell: ({ row }) => {
        const assignment = row.original.assignedMembers?.[0]
        if (!assignment) return <span className="text-[10px] text-muted-foreground/30 italic uppercase tracking-widest">Unassigned</span>

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-black text-foreground tracking-tighter uppercase line-clamp-1">
              {assignment.member?.user?.name}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/50 lowercase tracking-tight">
              {assignment.member?.user?.email}
            </span>
          </div>
        )
      },
    },
    {
      id: "assignedBy",
      meta: { title: "Assigned By" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned By" />
      ),
      cell: ({ row }) => {
        const assignment = row.original.assignedMembers?.[0]
        if (!assignment) return <span className="text-[10px] text-muted-foreground/30 italic uppercase tracking-widest">-</span>

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-black text-foreground/80 tracking-tighter uppercase line-clamp-1">
              {assignment.createdByUser?.name}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/50 lowercase tracking-tight">
              {assignment.createdByUser?.email}
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
        const company = row.original

        return (
          <StatusIndicator
            isActive={isActive}
            onToggle={() => onToggleStatus(company)}
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
      cell: ({ row, table }) => {
        const company = row.original

        const actions: Action[] = [
          {
            label: "View",
            onClick: () => onView(company)
          }
        ];

        if (capabilities.canUpdate) {
          actions.push({
            label: "Edit",
            onClick: () => onEdit(company)
          });
        }

        if (capabilities.canToggle) {
          actions.push({
            label: "Clients",
            onClick: () => onShowClients(company)
          });

          actions.push({
            label: company.isActive ? "Mark Inactive" : "Mark Active",
            onClick: () => onToggleStatus(company)
          });
        }

        if (capabilities.canAssign) {
          actions.push({
            label: "Assign",
            onClick: () => onAssignMembers(company)
          });
        }



        if (capabilities.canDelete) {
          actions.push({
            label: "Delete",
            onClick: () => onDelete(company),
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
