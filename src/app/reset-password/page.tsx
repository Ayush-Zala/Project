"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Industrial Reset Schema ──────────────────────────────
const resetSchema = z.object({
  password: z.string()
    .min(8, "Security protocol requires 8+ characters")
    .regex(/[A-Z]/, "Include one uppercase letter")
    .regex(/[a-z]/, "Include one lowercase letter")
    .regex(/[0-9]/, "Include one numeric digit")
    .regex(/[^A-Za-z0-9]/, "Include one special character (@$!%*?&)"),
  confirmPassword: z.string().min(1, "Confirmation is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Security mismatch: Passwords do not match",
  path: ["confirmPassword"],
});

type ResetValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");
    setToken(t);
  }, []);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchPassword = form.watch("password");

  // Strength Visual Logic
  const passwordStrength = useMemo(() => {
    if (!watchPassword) return 0;
    let score = 0;
    if (watchPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(watchPassword)) score += 1;
    if (/[0-9]/.test(watchPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(watchPassword)) score += 1;
    return score;
  }, [watchPassword]);

  const strengthLabel = useMemo(() => {
    switch (passwordStrength) {
      case 0: return "Insufficient";
      case 1: return "Weak";
      case 2: return "Medium";
      case 3: return "Strong";
      case 4: return "Industrial Elite";
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

  const handleReset = async (values: ResetValues) => {
    if (!token) {
      toast.error("Invalid or missing session token. Please request a new link.");
      return;
    }

    setIsLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to update security credentials");
    } else {
      setIsSuccess(true);
      toast.success("Security credentials synchronized successfully");
    }
  };

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

              <Card className="noir-card border-border/40 backdrop-blur-sm shadow-2xl">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleReset)}>
                    <CardHeader>
                      <CardTitle className="text-xl">Set New Password</CardTitle>
                      <CardDescription>
                        Ensure it&apos;s unique and strong.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Secure Password</FormLabel>
                            <FormControl>
                              <div className="relative group text-left">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  className="pl-10 pr-10 h-11 rounded-xl bg-muted/20"
                                  placeholder="••••••••"
                                  {...field}
                                  autoComplete="new-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 stroke-[1.5px]" />
                                  ) : (
                                    <Eye className="h-4 w-4 stroke-[1.5px]" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            
                            {/* Strength Visual Logic Integration */}
                            <div className="space-y-2 pt-1">
                              <div className="flex justify-between text-[10px] uppercase tracking-widest font-extrabold">
                                <span className={cn(passwordStrength > 0 ? "text-primary" : "text-muted-foreground")}>Security level</span>
                                <span className={cn(passwordStrength > 0 ? "text-primary" : "text-muted-foreground")}>{strengthLabel}</span>
                              </div>
                              <div className="flex gap-1.5 h-1">
                                {[1, 2, 3, 4].map((step) => (
                                  <div 
                                    key={step}
                                    className={cn(
                                      "flex-1 rounded-full transition-all duration-500",
                                      passwordStrength >= step ? strengthColor : "bg-muted/10"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative group text-left">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  className="pl-10 h-11 rounded-xl bg-muted/20"
                                  placeholder="••••••••"
                                  {...field}
                                  autoComplete="new-password"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter>
                      {!token ? (
                        <div className="w-full text-center text-sm p-4 bg-destructive/5 rounded-2xl border border-destructive/20 text-destructive font-bold">
                           ACCESS DENIED: No secure token found.
                           <div className="mt-2 text-xs font-normal">
                              <Link href="/forgot-password" title="Request link" className="underline underline-offset-4 hover:text-destructive/80">Re-authenticate here</Link>
                           </div>
                        </div>
                      ) : (
                        <Button
                          type="submit"
                          className="w-full group h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Update Password
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="reset-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="noir-card border-primary/20 bg-primary/5 py-8 rounded-2xl">
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                    <ShieldCheck className="h-10 w-10 text-primary stroke-[1.5px]" />
                  </div>
                  <CardTitle className="text-2xl">Security Update</CardTitle>
                  <CardDescription className="max-w-[280px]">
                    Your password has been successfully updated. You can now use your new credentials to log in.
                  </CardDescription>
                  <Button className="mt-4 w-full h-11 rounded-xl shadow-lg shadow-primary/20" asChild>
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
