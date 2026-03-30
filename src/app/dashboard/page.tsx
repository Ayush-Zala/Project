"use client"

import React from "react"
import { authClient } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-8 rounded-lg border-2 border-primary border-t-transparent"
        />
      </div>
    )
  }

  if (!session) {
    return null // Proxy will redirect
  }

  const user = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || "",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border/40">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
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
                 <p className="text-sm text-muted-foreground mt-1">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
             {/* Simple visual background */}
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
             
             <div className="relative z-10 flex flex-col h-full items-start justify-start">
                 <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to your command center</h2>
                 <p className="text-muted-foreground max-w-lg mb-8">
                    This premium Obsidian Noir dashboard provides you with a high-performance interface to manage your secure ecosystem.
                 </p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                         <span className="text-sm font-medium">System Event Log #{i}04</span>
                         <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-widest">Active</span>
                      </div>
                    ))}
                 </div>
             </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
