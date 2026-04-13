"use client"

import * as React from "react"
import {
  PlusIcon,
  RefreshCwIcon,
  Users2,
  ShieldAlert,
  Building2,
  MailPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import { Separator } from "@/components/ui/separator"
import { useHasPermission } from "@/hooks/use-has-permission"
import { authClient } from "@/lib/auth-client"
import { MemberDialog } from "@/components/organization/member-dialog"
import { DeleteMemberDialog } from "@/components/organization/delete-member-dialog"
import { OrgTabs } from "@/components/organization/org-tabs"
import { BulkDeleteMemberDialog } from "@/components/organization/bulk-delete-member-dialog"
import { ActionBar } from "@/components/data-table/action-bar"

import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationMemberColumns } from "@/components/organization/members-table-columns"
import { DataTableFilterField } from "@/types/data-table"
import { apiClient } from "@/lib/api-client"
import { useWorkspace } from "@/hooks/use-workspace"

export default function OrganisationMembersPage() {
  // 1. Auth & Context Hooks
  const { data: activeOrg, isLoading: isOrgPending, isExternal } = useWorkspace()
  const canCreate = useHasPermission("organisation_member:create")
  const canDelete = useHasPermission("organisation_member:delete")
  const canToggle = useHasPermission("organisation_member:toggle")
  
  // 2. State Hooks
  const [members, setMembers] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<any>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [isBulkLoading, setIsBulkLoading] = React.useState(false)

  // 3. Data Table Hook
  const { 
    table, 
    onSearchChange, 
    onFilterReset,
    search, 
    filters, 
    setFilters,
    sort, 
    page, 
    perPage 
  } = useDataTable({
    data: members,
    columns: React.useMemo(() => getOrganisationMemberColumns({
      capabilities: { canDelete, canToggle },
      onEdit: (m) => { setSelectedMember(m); setIsMemberDialogOpen(true); },
      onRemove: (m) => { setSelectedMember(m); setIsDeleteDialogOpen(true); },
      onToggleStatus: (m) => handleToggleStatus(m),
    }), [canDelete, canToggle]),
    pageCount,
  })

  // 4. Fetching Logic
  const fetchMembers = React.useCallback(async () => {
    if (!activeOrg) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (page) params.set("page", String(page))
      if (perPage) params.set("per_page", String(perPage))
      if (sort) params.set("sort", sort)
      if (search) params.set("search", search)
      if (filters?.length) params.set("filters", JSON.stringify(filters))

      const data = await apiClient(`/api/organisations/${activeOrg.id}/members?${params.toString()}`)
      setMembers(data.members)
      setPageCount(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Failed to load members", {
        className: "font-normal text-[13px] tracking-tight",
        duration: 5000,
        closeButton: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg, page, perPage, sort, search, filters])

  // 5. Event Handlers (Must be after fetchMembers)
  async function handleToggleStatus(member: any) {
    if (!activeOrg) return
    try {
      await apiClient(`/api/organisations/${activeOrg.id}/members/${member.id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive })
      })
      fetchMembers()
    } catch (error: any) {
      // apiClient already handled toast
    }
  }

  async function handleRemove(member: any) {
    if (!activeOrg) return
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const onBulkStatusUpdate = async (isActive: boolean) => {
    if (!activeOrg) return
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => (row.original as any).id)
    
    if (ids.length === 0) return

    setIsBulkLoading(true)
    try {
      await Promise.all(ids.map(id => 
        apiClient(`/api/organisations/${activeOrg.id}/members/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      ))
      
      table.toggleAllRowsSelected(false)
      fetchMembers()
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMembers()
    setIsRefreshing(false)
  }

  // 6. Effects & Subscriptions
  const { useEvent } = useSocket()
  
  useEvent("ORGANISATION_MEMBERS_CHANGED", React.useCallback(() => {
    fetchMembers()
  }, [fetchMembers]))

  useEvent("ORGANISATIONS_CHANGED", React.useCallback(() => {
    fetchMembers()
  }, [fetchMembers]))

  React.useEffect(() => {
    if (activeOrg) fetchMembers()
  }, [activeOrg, fetchMembers])

  // 7. Global Refresh Hardware Listener
  React.useEffect(() => {
    const handleGlobalRefresh = () => fetchMembers()
    window.addEventListener("ORG_MODULE_REFRESH", handleGlobalRefresh)
    return () => window.removeEventListener("ORG_MODULE_REFRESH", handleGlobalRefresh)
  }, [fetchMembers])

  if (isOrgPending) return null
  if (!activeOrg) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
        <ShieldAlert className="size-16 text-destructive/50" />
        <h1 className="text-2xl font-black uppercase tracking-tighter">No Active Workspace</h1>
        <p className="text-muted-foreground font-medium max-w-sm text-center italic">Please select an organization from the sidebar to manage members.</p>
        <Button onClick={() => window.location.href = "/dashboard/organisation"} variant="outline" className="font-bold uppercase tracking-wider text-xs border-primary/20 hover:bg-primary/5 transition-all">Go to Workspaces</Button>
    </div>
  )

  const filterFields: DataTableFilterField<any>[] = [
    { label: "Name", id: "user_name", variant: "text" },
    { 
      label: "Role", 
      id: "role", 
      variant: "select", 
      options: [
        { label: "Owner", value: "owner" },
        { label: "Member", value: "member" }
      ] 
    },
    { 
      label: "Access", 
      id: "isActive", 
      variant: "select", 
      options: [
        { label: "Active", value: "true" },
        { label: "Suspended", value: "false" }
      ] 
    },
  ]

  return (
    <>
      <div className="w-full">
        <DataTable
            table={table}
            isLoading={isLoading}
            isSearchActive={!!search}
            isRefreshing={isRefreshing}
        >
            <DataTableAdvancedToolbar 
                table={table} 
                filterFields={filterFields}
                filters={filters}
                setFilters={setFilters}
                onSearchChange={onSearchChange}
                onFilterReset={onFilterReset}
                search={search}
                exportFilename="organisation-members"
                className="mb-4"
            />
        </DataTable>
        
        <p className="text-[11px] font-medium text-muted-foreground/60 text-center mt-8 italic tracking-tight">
           Displaying {members.length} of {totalCount} members
        </p>

        <MemberDialog 
          open={isMemberDialogOpen}
          onOpenChange={setIsMemberDialogOpen}
          organizationId={activeOrg?.id?.toString() || ""}
          member={selectedMember}
          onSuccess={fetchMembers}
        />

        <DeleteMemberDialog 
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          member={selectedMember}
          organizationId={activeOrg?.id?.toString() || ""}
          onSuccess={fetchMembers}
        />

        <BulkDeleteMemberDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          members={table.getFilteredSelectedRowModel().rows.map(row => row.original)}
          organizationId={activeOrg?.id?.toString() || ""}
          onSuccess={() => {
            table.toggleAllRowsSelected(false)
            fetchMembers()
          }}
        />

        <ActionBar table={table}>
           {((canToggle || canDelete) && !table.getFilteredSelectedRowModel().rows.some(row => (row.original as any).role === 'owner')) && (
             <>
               {table.getFilteredSelectedRowModel().rows.length === 1 ? (
                 table.getFilteredSelectedRowModel().rows[0].original.isActive ? (
                   canToggle && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       disabled={isBulkLoading}
                       onClick={() => onBulkStatusUpdate(false)}
                       className="h-8 px-4 hover:bg-muted/10 text-muted-foreground rounded-full transition-all border border-border/20 active:scale-[0.98]"
                     >
                       <span className="text-[10px] font-black uppercase tracking-widest">Mark Inactive</span>
                     </Button>
                   )
                 ) : (
                   canToggle && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       disabled={isBulkLoading}
                       onClick={() => onBulkStatusUpdate(true)}
                       className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                     >
                       <span className="text-[10px] font-black uppercase tracking-widest">Mark Active</span>
                     </Button>
                   )
                 )
               ) : (
                 <>
                   {canToggle && (
                     <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isBulkLoading}
                          onClick={() => onBulkStatusUpdate(true)}
                          className="h-8 px-4 hover:bg-primary/10 text-primary rounded-full transition-all border border-border/20 active:scale-[0.98]"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Mark Active</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isBulkLoading}
                          onClick={() => onBulkStatusUpdate(false)}
                          className="h-8 px-4 hover:bg-muted/10 text-muted-foreground rounded-full transition-all border border-border/20 active:scale-[0.98]"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Mark Inactive</span>
                        </Button>
                     </>
                   )}
                 </>
               )}
               {canDelete && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   disabled={isBulkLoading}
                   onClick={() => setIsBulkDeleteDialogOpen(true)}
                   className="h-8 px-4 hover:bg-destructive/10 text-destructive rounded-full transition-all border border-border/20 active:scale-[0.98]"
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                 </Button>
               )}
             </>
           )}
        </ActionBar>
      </div>
    </>
  )
}
