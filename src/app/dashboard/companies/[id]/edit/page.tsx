"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { CompanyForm } from "@/components/company/company-form"
import { CompanyFormSkeleton } from "@/components/company/company-form-skeleton"
import { apiClient } from "@/lib/api-client"

export default function EditCompanyPage() {
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  const [company, setCompany] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

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
          { label: company?.name || "Edit Profile" }
        ]}
      />

      <PageShell>
        <div className="w-full py-8 px-4 sm:px-0">
          {isLoading ? (
            <CompanyFormSkeleton />
          ) : (
            <CompanyForm
              initialData={company}
              isEdit={true}
              onSuccess={() => {
                router.push("/dashboard/companies")
                router.refresh()
              }}
            />
          )}
        </div>
      </PageShell>
    </div>
  )
}
