import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PageShell } from "@/components/dashboard/page-shell"
import { CompanyFormSkeleton } from "@/components/company/company-form-skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Companies", href: "/dashboard/companies" },
          { label: "Loading..." }
        ]}
      />

      <PageShell>
        <div className="w-full py-8 px-4 sm:px-0">
          <CompanyFormSkeleton />
        </div>
      </PageShell>
    </div>
  )
}
