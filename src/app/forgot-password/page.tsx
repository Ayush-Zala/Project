"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setIsLoading(false);

    if (error) {
      setError(error.message || "Failed to send reset link");
    } else {
      setIsSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <AnimatePresence mode="wait">
          {!isSent ? (
            <motion.div
              key="request-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                  <KeyRound className="h-6 w-6 text-primary stroke-[1.5px]" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Forgot Password?
                </h1>
                <p className="mt-2 text-muted-foreground">
                  No worries, we&apos;ll send you reset instructions.
                </p>
              </div>

              <Card className="noir-card border-border/40 backdrop-blur-sm">
                <form onSubmit={handleRequestReset}>
                  <CardHeader>
                    <CardTitle className="text-xl">Reset Request</CardTitle>
                    <CardDescription>
                      Enter your account email to receive a secure link.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                        <Input
                          id="email"
                          placeholder="name@example.com"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-3 rounded-lg flex items-center gap-2"
                      >
                         <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                         {error}
                      </motion.div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      className="w-full group"
                      loading={isLoading}
                    >
                      Send Reset Link
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                    </Button>
                    <div className="text-sm text-center">
                      <Link
                        href="/login"
                        className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                      >
                        Back to Login
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success-sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="noir-card border-primary/20 bg-primary/5 py-8">
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-10 w-10 text-primary stroke-[1.5px]" />
                  </div>
                  <CardTitle className="text-2xl">Email Sent</CardTitle>
                  <CardDescription className="max-w-[280px]">
                    We&apos;ve sent a password reset link to <strong>{email}</strong>.
                    Please check your inbox.
                  </CardDescription>
                  <div className="flex flex-col gap-3 w-full mt-4">
                    <Button variant="outline" className="w-full border-primary/30" asChild>
                      <Link href="/login">Return to Login</Link>
                    </Button>
                    <button 
                      onClick={() => setIsSent(false)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Didn&apos;t get the email? Try again
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
