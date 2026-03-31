"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LogIn, Mail, Lock, ArrowRight, Eye, EyeOff, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";

// ── Industrial Login Schema ──────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Please enter a valid command email"),
  password: z.string().min(1, "Password is required for authentication"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: LoginValues) => {
    setIsLoading(true);

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/dashboard",
    });

    setIsLoading(true); // Keep loading while redirecting

    if (error) {
      setIsLoading(false);
      // More robust check for suspension error
      const isSuspended = error.status === 403 && error.message?.toLowerCase().includes("suspended");
      if (isSuspended) {
        toast.error(error.message, {
          description: "This account has been deactivated by an administrator.",
        });
        // Also show as a validation error on the email field
        form.setError("email", {
          type: "manual",
          message: error.message,
        });
      } else if (error.status === 403) {
        toast.error("Access Forbidden: Please verify your email first.");
      } else {
        toast.error(error.message || "Invalid credentials provided");
      }
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push("/forgot-password");
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
            <LogIn className="h-6 w-6 text-primary stroke-[1.5px]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome Back
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your Obsidian Noir account.
          </p>
        </div>

        <Card className="noir-card border-border/40 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the command center
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                          <Input
                            placeholder="name@example.com"
                            className="pl-10 h-11 rounded-xl bg-muted/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-primary hover:underline underline-offset-4 cursor-pointer relative z-30"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative group text-left">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10 h-11 rounded-xl bg-muted/20"
                            placeholder="••••••••"
                            {...field}
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
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full group h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Log In
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                    </>
                  )}
                </Button>
                <div className="text-sm text-center text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="text-primary font-medium hover:underline transition-all underline-offset-4"
                  >
                    Create Account
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
}
