"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit3, Building, Loader2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { CompanyView } from "@/components/company/company-view"
import { CompanyFormSkeleton } from "@/components/company/company-form-skeleton"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { useHasPermission } from "@/hooks/use-has-permission"

export default function ViewCompanyPage() {
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  const [company, setCompany] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const canUpdate = useHasPermission("company:update")

  React.useEffect(() => {
    async function loadCompany() {
      try {
        const data = await apiClient(`/api/companies/${companyId}`)
        setCompany(data)
      } catch (error) {
        // apiClient handles toast
        router.push("/dashboard/companies")
      } finally {
        setIsLoading(false)
      }
    }
    loadCompany()
  }, [companyId, router])

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Companies", href: "/dashboard/companies" },
          { label: company?.name || "View Profile" }
        ]}
      >
        <div className="flex items-center gap-3">
          {!isLoading && canUpdate && (
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/companies/${companyId}/edit`)}
              className="h-9 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
            >
              Edit
            </Button>
          )}
        </div>
      </DashboardHeader>

      <PageShell>
        <div className="w-full py-8">
          {isLoading ? (
            <div className="space-y-8">
              <div className="h-64 bg-background border border-border/40 rounded-[2.5rem] animate-pulse flex items-center justify-center">
                <Loader2 className="size-8 text-primary/20 animate-spin" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 bg-background border border-border/40 rounded-[2rem] animate-pulse" />
                <div className="h-80 bg-background border border-border/40 rounded-[2rem] animate-pulse" />
              </div>
            </div>
          ) : (
            <CompanyView data={company} />
          )}
        </div>
      </PageShell>
    </div>
  )
}
