"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (!token) {
        setStatus("error");
        setErrorMessage("Invalid or missing verification token.");
        return;
      }

      const { data, error } = await authClient.verifyEmail({
        query: { token },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Verification failed");
      } else {
        setStatus("success");
      }
    };

    verify();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary stroke-[1.5px]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Account Verification
          </h1>
        </div>

        <Card className="noir-card border-border/40 backdrop-blur-sm overflow-hidden relative">
          {/* Animated accent gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-primary stroke-[1.5px]" />
                </div>
              )}
              {status === "error" && (
                <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-destructive stroke-[1.5px]" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {status === "loading" && "Verifying your account..."}
              {status === "success" && "Successfully Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            
            <CardDescription className="px-6">
              {status === "loading" && "Please wait while we confirm your identity."}
              {status === "success" && "Your account has been fully activated. You can now access all features of Obsidian Noir."}
              {status === "error" && (errorMessage || "The link may be expired or invalid.")}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col pt-2 pb-8 px-8 items-center">
            {status === "success" && (
              <Button asChild className="w-full group">
                <Link href="/login">
                  Log in to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 stroke-[1.5px]" />
                </Link>
              </Button>
            )}
            {status === "error" && (
              <div className="flex flex-col gap-4 w-full">
                <Button asChild className="w-full">
                  <Link href="/signup">Create a new account</Link>
                </Button>
                <Link
                  href="/login"
                  className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            )}
            {status === "loading" && (
              <p className="text-sm text-muted-foreground animate-pulse">This should only take a moment.</p>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
