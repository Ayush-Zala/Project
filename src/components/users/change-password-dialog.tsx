"use client"

import * as React from "react"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon, KeyIcon, EyeIcon, EyeOffIcon } from "lucide-react"

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirmation must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
  onSuccess: () => void
}

export function ChangePasswordDialog({ open, onOpenChange, user, onSuccess }: ChangePasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        password: "",
        confirmPassword: "",
      })
    }
  }, [open, form])

  async function onSubmit(values: PasswordFormValues) {
    if (!user) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/users/${user.id}/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update password")
      }

      toast.success("Account password reset successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-background border-border/40">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-primary/10 rounded-lg">
                <KeyIcon className="h-5 w-5 text-primary" />
             </div>
             <DialogTitle className="text-xl font-bold tracking-tight">Force Password Reset</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pb-2 border-b border-border/40">
            Securely override the password for 
            <span className="font-bold text-foreground px-1">"{user?.name}"</span> 
            ({user?.email}). The user will need their new credentials on next login.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid gap-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }: { field: ControllerRenderProps<PasswordFormValues, "password"> }) => (
                  <FormItem>
                  <FormLabel>New Secure Password</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        autoComplete="new-password"
                        placeholder="••••••••" 
                        {...field} 
                        className="bg-muted/30 border-border/40 focus:border-primary/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }: { field: ControllerRenderProps<PasswordFormValues, "confirmPassword"> }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        autoComplete="new-password"
                        placeholder="••••••••" 
                        {...field} 
                        className="bg-muted/30 border-border/40 focus:border-primary/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-8 gap-2 sm:gap-0 pt-4 border-t border-border/40">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-border/40 hover:bg-muted/50 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px] rounded-xl shadow-lg shadow-primary/20"
              >
                {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
