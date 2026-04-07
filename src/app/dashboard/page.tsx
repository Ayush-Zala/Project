"use client"

/**
 * dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Dashboard overview page — sidebar is provided by layout.tsx.
 * This file only renders the page-specific header + content.
 * ─────────────────────────────────────────────────────────────
 */

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { authClient } from "@/lib/auth-client"

export default function DashboardPage() {
  const { data: session } = authClient.useSession()

  return (
    <>
      {/* ── Top header bar ────────────────────────────────── */}
      <DashboardHeader 
        breadcrumbs={[{ label: "Overview" }]} 
      />

      {/* ── Page content ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid auto-rows-min gap-6 md:grid-cols-3">
          <div className="aspect-video rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center justify-center p-6 text-center group hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/10 mb-4 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <h3 className="font-semibold">Security Level</h3>
            <p className="text-sm text-muted-foreground mt-1">Premium Protected</p>
          </div>
          <div className="aspect-video rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center justify-center p-6 text-center group hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/10 mb-4 flex items-center justify-center text-primary font-bold">
              {new Date().getDate()}
            </div>
            <h3 className="font-semibold">Last Login</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Today, {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="aspect-video rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center justify-center p-6 text-center group hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/10 mb-4 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
            <h3 className="font-semibold">System Status</h3>
            <p className="text-sm text-muted-foreground mt-1">All Systems Nominal</p>
          </div>
        </div>

        <div className="min-h-[100vh] flex-1 rounded-2xl bg-muted/20 border border-border/40 p-8 md:min-h-min relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
          <div className="relative z-10 flex flex-col h-full items-start justify-start">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Welcome to your command center
            </h2>
            <p className="text-muted-foreground max-w-lg mb-8">
              This premium Obsidian Noir dashboard provides you with a high-performance
              interface to manage your secure ecosystem.
            </p>
            {session && (
              <p className="text-sm text-muted-foreground mb-6">
                Logged in as <span className="text-foreground font-medium">{session.user.email}</span>
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-sm font-medium">System Event Log #{i}04</span>
                  <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-widest">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
