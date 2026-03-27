"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LogOut, User, Mail, ShieldCheck, LayoutDashboard, Settings, Bell, Search, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-8 rounded-lg border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (!session) {
    return null; // Proxy will redirect
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary stroke-[1.5px]" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 hidden sm:block">
                Obsidian Noir
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <LayoutDashboard className="h-4 w-4 stroke-[1.5px] mr-1" />
                Dashboard
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Settings className="h-4 w-4 stroke-[1.5px] mr-1" />
                Settings
              </div>
              <div className="h-8 w-[1px] bg-border/40" />
              
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="flex items-center gap-3 pl-2 border-l border-border/40">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold leading-none">{session.user.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-none mt-1">{session.user.email}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {session.user.name?.[0].toUpperCase()}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
                    <LogOut className="h-4 w-4 stroke-[1.5px]" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-3 md:hidden">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-5 w-5 stroke-[1.5px]" /> : <Menu className="h-5 w-5 stroke-[1.5px]" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border/40 bg-card p-4 space-y-4 shadow-2xl"
          >
             <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted cursor-pointer">
                <LayoutDashboard className="h-4 w-4 stroke-[1.5px] mr-2" />
                Dashboard
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted cursor-pointer">
                <Settings className="h-4 w-4 stroke-[1.5px] mr-2" />
                Settings
              </div>
              <div className="pt-4 border-t border-border/40 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {session.user.name?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{session.user.name}</span>
                        <span className="text-xs text-muted-foreground">{session.user.email}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-5 w-5 stroke-[1.5px]" />
                </Button>
              </div>
          </motion.div>
        )}
      </nav>

      {/* Dashboard Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Dashboard
            </h2>
            <p className="mt-2 text-muted-foreground">
              Welcome back to your premium command center.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="noir" size="sm" className="hidden sm:flex">
                <Bell className="h-4 w-4 mr-2 stroke-[1.5px]" />
                Notifications
             </Button>
             <Button size="sm">
                New Action
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <Card className="noir-card border-border/20 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">User Status</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-500 stroke-[1.5px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Authenticated</div>
              <p className="text-xs text-muted-foreground mt-1">
                Your account is secure and verified.
              </p>
            </CardContent>
          </Card>

          <Card className="noir-card border-border/20 overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Created</CardTitle>
              <User className="h-4 w-4 text-primary stroke-[1.5px]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(session.user.createdAt).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Member of Obsidian Noir.
              </p>
            </CardContent>
          </Card>

          <Card className="noir-card border-border/20 overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quick Action</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground stroke-[1.5px]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Verified</div>
              <p className="text-xs text-muted-foreground mt-1">
                 {session.user.emailVerified ? "Email is confirmed" : "Verification pending"}
              </p>
            </CardContent>
          </Card>

          {/* User Profile Details Card */}
          <Card className="noir-card border-border/20 md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your public identity on Obsidian Noir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary/20">
                    {session.user.name?.[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col justify-center space-y-2">
                    <div>
                      <h4 className="text-lg font-bold">{session.user.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                         <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{session.user.emailVerified ? "Verified" : "Unverified"}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 stroke-[1.5px]" />
                            {session.user.email}
                        </div>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl border border-border/40">
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">User Identification</span>
                     <p className="text-sm font-mono mt-2 truncate">{session.user.id}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/40">
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Last Activity</span>
                     <p className="text-sm mt-2">{new Date().toLocaleString()}</p>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Simple Recent Activity Placeholder */}
          <Card className="noir-card border-border/20">
             <CardHeader>
              <CardTitle className="text-lg">Recent Logs</CardTitle>
              <CardDescription>Security and account events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">Session initialized</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Today at 10:45 AM</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                 View all activities
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Premium Footer */}
      <footer className="border-t border-border/40 bg-card/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-xs text-muted-foreground">© 2026 Obsidian Noir. Handcrafted for premium experiences.</span>
              <div className="flex gap-6 text-xs text-muted-foreground">
                 <span className="hover:text-foreground transition-colors cursor-pointer">Security Policy</span>
                 <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Terms</span>
                 <span className="hover:text-foreground transition-colors cursor-pointer">System Status</span>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}
