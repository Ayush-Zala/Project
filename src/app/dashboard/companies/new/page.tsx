"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { CompanyForm } from "@/components/company/company-form"

export default function NewCompanyPage() {
  const router = useRouter()

  return (
    <div className="font-sans flex flex-col min-h-screen bg-muted/20">
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Companies", href: "/dashboard/companies" },
          { label: "Add New Company" }
        ]}
      />

      <PageShell>
        <div className="w-full py-8">
          <CompanyForm
            onSuccess={() => {
              router.push("/dashboard/companies")
              router.refresh()
            }}
          />
        </div>
      </PageShell>
    </div>
  )
}
