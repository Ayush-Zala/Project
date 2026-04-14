"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { PageShell } from "@/components/dashboard/page-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Calendar" }
        ]}
      />

      <div className="flex-1 w-full bg-background overflow-auto">
        <div className="h-full w-full px-4 md:px-12 lg:px-24">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              showOutsideDays={true}
              captionLayout="dropdown"
              startMonth={new Date(1950, 0)}
              endMonth={new Date(2100, 11)}
              className="w-full h-full p-0"
              classNames={{
                months: "w-full h-full",
                month: "w-full h-full flex flex-col pt-4 pb-8",
              }}
            />
        </div>
      </div>
    </div>
  )
}
