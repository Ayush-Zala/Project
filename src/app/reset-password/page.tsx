"use client";

import React, { useState, useEffect, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");
    setToken(t);
  }, []);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    switch (passwordStrength) {
      case 0: return "Too Weak";
      case 1: return "Weak";
      case 2: return "Medium";
      case 3: return "Strong";
      case 4: return "Premium";
      default: return "";
    }
  }, [passwordStrength]);

  const strengthColor = useMemo(() => {
    switch (passwordStrength) {
      case 0: return "bg-muted";
      case 1: return "bg-destructive";
      case 2: return "bg-yellow-500";
      case 3: return "bg-primary";
      case 4: return "bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]";
      default: return "bg-muted";
    }
  }, [passwordStrength]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        setError("Invalid or missing session token.");
        return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordStrength < 2) {
      setError("Please choose a stronger password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await authClient.resetPassword({
      newPassword,
      token,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message || "Failed to update password");
    } else {
      setIsSuccess(true);
    }
  };

  if (!token && typeof window !== "undefined") {
    // Optionally handle missing token visually
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative">
       <div className="absolute top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="reset-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                  <ShieldCheck className="h-6 w-6 text-primary stroke-[1.5px]" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Update Password
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Choose a secure new password for your account.
                </p>
              </div>

              <Card className="noir-card border-border/40 backdrop-blur-sm">
                <form onSubmit={handleReset}>
                  <CardHeader>
                    <CardTitle className="text-xl">Set New Password</CardTitle>
                    <CardDescription>
                      Ensure it&apos;s unique and strong.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          autoComplete="new-password"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4 stroke-[1.5px]" /> : <Eye className="h-4 w-4 stroke-[1.5px]" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                           <span className={cn(passwordStrength > 0 ? "text-primary" : "text-muted-foreground")}>Strength</span>
                           <span className={cn(passwordStrength > 0 ? "text-primary" : "text-muted-foreground")}>{strengthLabel}</span>
                        </div>
                        <div className="flex gap-1.5 h-1">
                           {[1, 2, 3, 4].map((step) => (
                             <div 
                                key={step}
                                className={cn(
                                    "flex-1 rounded-full transition-all duration-500",
                                    passwordStrength >= step ? strengthColor : "bg-muted/30"
                                )}
                             />
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                        <Input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-3 rounded-lg flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        {error}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    {!token ? (
                        <div className="w-full text-center text-sm p-4 bg-destructive/5 rounded-lg border border-destructive/20 text-destructive">
                             No secure token found. Please request a new link.
                             <div className="mt-2">
                                <Link href="/forgot-password" className="font-bold underline">Resend Link</Link>
                             </div>
                        </div>
                    ) : (
                        <Button
                            type="submit"
                            className="w-full group"
                            loading={isLoading}
                        >
                            Update Password
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                        </Button>
                    )}
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="reset-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="noir-card border-primary/20 bg-primary/5 py-8">
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                    <ShieldCheck className="h-10 w-10 text-primary stroke-[1.5px]" />
                  </div>
                  <CardTitle className="text-2xl">Security Update</CardTitle>
                  <CardDescription className="max-w-[280px]">
                    Your password has been successfully updated. You can now use your new credentials to log in.
                  </CardDescription>
                  <Button className="mt-4 w-full" asChild>
                    <Link href="/login">Return to Login</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
