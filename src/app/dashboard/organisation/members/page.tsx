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
import { OrgTabs } from "@/components/organization/org-tabs"

import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

// Data Table Imports
import { DataTable } from "@/components/data-table/data-table"
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import { getOrganisationMemberColumns } from "@/components/organization/members-table-columns"
import { DataTableFilterField } from "@/types/data-table"
import { apiClient } from "@/lib/api-client"

export default function OrganisationMembersPage() {
  // 1. Auth & Context Hooks
  const { data: activeOrg, isPending: isOrgPending } = authClient.useActiveOrganization()
  const canManage = useHasPermission("organisation:member:manage")
  
  // 2. State Hooks
  const [members, setMembers] = React.useState<any[]>([])
  const [pageCount, setPageCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<any>(null)

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
      capabilities: { canUpdate: canManage, canDelete: canManage, canManage },
      onEdit: (m) => { setSelectedMember(m); setIsMemberDialogOpen(true); },
      onRemove: (m) => handleRemove(m),
      onToggleStatus: (m) => handleToggleStatus(m),
    }), [canManage]),
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
    if (!confirm(`Are you sure you want to remove ${member.user.name}?`)) return
    
    try {
      await apiClient(`/api/organisations/${activeOrg.id}/members/${member.id}`, { method: "DELETE" })
      fetchMembers()
    } catch (error: any) {
      // apiClient already handled toast
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

  if (isOrgPending) return <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-primary animate-pulse">Loading...</div>
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
      <DashboardHeader 
        breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Organization", href: "/dashboard/organisation" },
            { label: "Members" }
        ]}
      >
        <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95"
            title="Refresh"
        >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        {canManage && (
            <Button
              size="sm"
              onClick={() => { setSelectedMember(null); setIsMemberDialogOpen(true); }}
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95 font-bold uppercase tracking-wider text-[10px]"
            >
              <MailPlus className="h-4 w-4" />
              Add Member
            </Button>
        )}
      </DashboardHeader>

      <PageShell>
        <div className="flex items-center gap-3 mb-8 bg-muted/20 p-4 rounded-2xl border border-border/50">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Building2 className="size-5 text-primary" />
            </div>
            <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-tight text-foreground">{activeOrg.name}</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Organization Members</p>
            </div>
            <div className="ml-auto">
                <OrgTabs />
            </div>
        </div>

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
                className="mb-4"
            />
        </DataTable>
        
        <p className="text-[11px] font-medium text-muted-foreground/60 text-center mt-8 italic tracking-tight">
           Displaying {members.length} of {totalCount} members
        </p>
      </PageShell>
      <MemberDialog 
         open={isMemberDialogOpen}
         onOpenChange={setIsMemberDialogOpen}
         organizationId={Number(activeOrg.id)}
         member={selectedMember}
         onSuccess={() => fetchMembers()}
      />
    </>
  )
}
