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
import { UserPlus, User, Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";

// ── Industrial Signup Schema ──────────────────────────────
const signupSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  email: z.string().email("Please enter a valid command email"),
  password: z.string()
    .min(8, "Security protocol requires 8+ characters")
    .regex(/[A-Z]/, "Include one uppercase letter")
    .regex(/[a-z]/, "Include one lowercase letter")
    .regex(/[0-9]/, "Include one numeric digit")
    .regex(/[^A-Za-z0-9]/, "Include one special character (@$!%*?&)"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleSignup = async (values: SignupValues) => {
    setIsLoading(true);

    const { data, error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: "/dashboard",
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "An error occurred during signup");
    } else {
      setIsSuccess(true);
      toast.success("Security account provisioned successfully");
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
              <Card className="noir-card border-border/40 backdrop-blur-sm shadow-2xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Sign Up</CardTitle>
                  <CardDescription>
                    Fill in your identity manifest to get started
                  </CardDescription>
                </CardHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSignup)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                                <Input
                                  placeholder="John Doe"
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
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors stroke-[1.5px]" />
                                <Input
                                  placeholder="name@example.com"
                                  type="email"
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
                            <FormLabel>Secure Password</FormLabel>
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
                            Create Account
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                          </>
                        )}
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
                </Form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="noir-card border-primary/20 bg-primary/5 py-8 rounded-2xl">
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-10 w-10 text-primary stroke-[1.5px]" />
                  </div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription className="max-w-[280px]">
                    We've sent a verification link to <strong>{form.getValues("email")}</strong>.
                    Please verify your account to continue.
                  </CardDescription>
                  <Button asChild variant="outline" className="mt-4 border-primary/30 hover:bg-primary/10 rounded-xl">
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

// Stub for RefreshCwIcon since it was missing in original but used in profile
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M3 3v5h5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}
