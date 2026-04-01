"use client"

import * as React from "react"
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  LibraryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  MoreVerticalIcon,
  PowerIcon,
  ShieldIcon,
  UsersIcon,
  ExternalLinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { TeamDialog } from "@/components/teams/team-dialog"
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useSocket } from "@/providers/socket-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useHasPermission } from "@/hooks/use-has-permission"
import Link from "next/link"

export default function TeamsPage() {
  const [teams, setTeams] = React.useState<any[]>([])
  const [pagination, setPagination] = React.useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Dialog states
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<any>(null)

  // 🛡️ Capability Guards
  const canCreate = useHasPermission("teams:create")
  const canUpdate = useHasPermission("teams:update")
  const canDelete = useHasPermission("teams:delete")
  const canToggle = useHasPermission("teams:toggle")
  const canReadRoles = useHasPermission("team_roles:read")
  const canReadMembers = useHasPermission("team_members:read")

  const fetchTeams = React.useCallback(async (page: number = pagination.page, searchTerm: string = search) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/teams?page=${page}&limit=${pagination.limit}&search=${searchTerm}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTeams(data.teams)
      setPagination(data.pagination)
    } catch (error: any) {
      toast.error(error.message || "Failed to load teams")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.limit, search])

  // 🔌 Real-time WebSocket sync
  const { useEvent } = useSocket()
  useEvent("TEAMS_CHANGED", React.useCallback(() => {
    fetchTeams(pagination.page, search)
  }, [fetchTeams, pagination.page, search]))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams(1, search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, fetchTeams])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTeams(1)
    setIsRefreshing(false)
    toast.success("Teams manifest synchronized")
  }

  const handleToggleStatus = async (team: any) => {
    try {
      const res = await fetch(`/api/teams/${team.id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to toggle status")
      }

      const updated = await res.json()
      setTeams(prev => prev.map(t => t.id === team.id ? { ...t, isActive: updated.isActive } : t))
      toast.success(`Team [${team.name}] is now ${updated.isActive ? 'active' : 'suspended'}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Teams Registry</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-muted/20 p-8 rounded-2xl border border-border/40 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LibraryIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Teams</h1>
            </div>
            <p className="text-muted-foreground ml-11">Manage organizational units, localized roles, and user memberships.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Team name..."
                className="pl-10 w-full md:w-[280px] bg-background/50 border-border/40 focus:border-primary/50 transition-all rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-border/40 hover:bg-muted/50 rounded-xl h-10 w-10 text-muted-foreground hover:text-primary transition-all active:scale-95"
              title="Sync Manifest"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {canCreate && (
              <Button
                onClick={() => { setSelectedTeam(null); setIsTeamDialogOpen(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New Team</span>
              </Button>
            )}
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-background/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCwIcon className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm font-medium tracking-widest uppercase">Syncing Manifest</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[80px] text-center font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">S.No</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Team Identity</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Structure</TableHead>
                {canToggle && (
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Status</TableHead>
                )}
                {(canUpdate || canDelete || true) && ( // true because 'Manage Details' is always there if they can read
                  <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground pr-8">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + (canToggle ? 1 : 0) + 1} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-4 bg-muted/20 rounded-full mb-2">
                        <LibraryIcon className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No organizational units detected</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team, index) => (
                  <TableRow key={team.id} className="border-border/20 group hover:bg-primary/5 transition-colors">
                    <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground py-6">
                      #{(pagination.page - 1) * pagination.limit + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{team.name}</span>
                        <span className="text-[11px] text-muted-foreground/60 max-w-[300px] truncate">
                          {team.description || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className="bg-muted/50 text-[9px] uppercase tracking-widest font-black px-2 py-0.5 border-border/40"
                        >
                          {team._count?.roles || 0} Roles
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className="bg-muted/50 text-[9px] uppercase tracking-widest font-black px-2 py-0.5 border-border/40"
                        >
                          {team._count?.members || 0} Members
                        </Badge>
                      </div>
                    </TableCell>
                    {canToggle && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Switch
                            checked={team.isActive}
                            onCheckedChange={() => handleToggleStatus(team)}
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${team.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {team.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-muted group-hover:bg-muted transition-colors">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-[180px] bg-popover border-border/40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 flex items-center justify-between">
                              Team Control
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/40" />
                            
                            <DropdownMenuItem
                               className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                               render={<Link href={`/dashboard/teams/${team.id}`} />}
                             >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                              <span>Manage Details</span>
                            </DropdownMenuItem>

                            {canUpdate && (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors py-2"
                                onClick={() => { setSelectedTeam(team); setIsTeamDialogOpen(true); }}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                                <span>Edit Profile</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>

                          {canDelete && (
                            <>
                              <DropdownMenuSeparator className="bg-border/40" />
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer transition-colors py-2"
                                  onClick={() => { setSelectedTeam(team); setIsDeleteDialogOpen(true); }}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" />
                                  <span>Purge Team</span>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 bg-muted/10 border-t border-border/40">
            <p className="text-xs text-muted-foreground italic">
              Showing <span className="font-bold text-foreground">{teams.length}</span> of <span className="font-bold text-foreground">{pagination.total}</span> organizational units
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-border/40"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchTeams(pagination.page - 1)}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {pagination.page}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-border/40"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchTeams(pagination.page + 1)}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <TeamDialog
        open={isTeamDialogOpen}
        onOpenChange={setIsTeamDialogOpen}
        team={selectedTeam}
        onSuccess={() => fetchTeams(pagination.page)}
      />
      <DeleteTeamDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        team={selectedTeam}
        onSuccess={() => fetchTeams(pagination.page)}
      />
    </>
  )
}
