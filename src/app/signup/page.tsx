"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserPlus, Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: "/dashboard",
    });

    setIsLoading(false);

    if (error) {
      setError(error.message || "An error occurred during signup");
    } else {
      setIsSuccess(true);
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
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
            <UserPlus className="h-6 w-6 text-primary stroke-[1.5px]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Create Account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Join Obsidian Noir to experience the premium elite.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="signup-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="noir-card border-border/40 backdrop-blur-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Sign Up</CardTitle>
                  <CardDescription>
                    Fill in your details to get started
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                        <Input
                          id="name"
                          placeholder="John Doe"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Adress</Label>
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
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 stroke-[1.5px]" /> : <Eye className="h-4 w-4 stroke-[1.5px]" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-3 rounded-lg flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        {error}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      className="w-full group"
                      loading={isLoading}
                    >
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                    </Button>
                    <div className="text-sm text-center text-muted-foreground">
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="text-primary font-medium hover:underline transition-all underline-offset-4"
                      >
                        Log in
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="noir-card border-primary/20 bg-primary/5 py-8">
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-10 w-10 text-primary stroke-[1.5px]" />
                  </div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription className="max-w-[280px]">
                    We've sent a verification link to <strong>{email}</strong>.
                    Please verify your account to continue.
                  </CardDescription>
                  <Button asChild variant="outline" className="mt-4 border-primary/30 hover:bg-primary/10">
                    <Link href="/login">Back to Login</Link>
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
