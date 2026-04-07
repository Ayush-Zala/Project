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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2Icon, ShieldIcon, UserIcon, EyeIcon, EyeOffIcon } from "lucide-react"

// Schema varies based on creation vs editing
const userSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  email: z.string().email("Invalid industrial email address"),
  roleId: z.string().min(1, "Access role assignment required"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If no password is provided (editing), it's fine. 
  // Custom validation inside onSubmit handles the complexity for creation.
  return true;
}, {
  message: "Security mismatch: Passwords do not match",
  path: ["confirmPassword"],
})

type UserFormValues = z.infer<typeof userSchema>

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: any // Selected user for editing
  roles: { id: number; name: string; isAssignable?: boolean }[]
  onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, user, roles, onSuccess }: UserDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      roleId: "",
      password: "",
      confirmPassword: "",
    },
  })

  // Sync form when user changes (edit mode)
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        roleId: user.role?.id?.toString() || "",
        password: "", // Not used in edit
        confirmPassword: "", // Not used in edit
      })
    } else {
      form.reset({
        name: "",
        email: "",
        roleId: "",
        password: "",
        confirmPassword: "",
      })
    }
  }, [user, form])

  async function onSubmit(values: UserFormValues) {
    // ── Additional validation for Creation Mode ───────────────
    if (!user) {
      if (!values.password || values.password.length < 6) {
        form.setError("password", { message: "Password must be at least 6 characters" })
        return
      }
      if (values.password !== values.confirmPassword) {
        form.setError("confirmPassword", { message: "Passwords do not match" })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const url = user ? `/api/users/${user.id}` : "/api/users"
      const method = user ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          roleId: parseInt(values.roleId)
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process user request")
      }

      toast.success(user ? "User updated successfully" : "User created successfully")
      form.reset({
        name: "",
        email: "",
        roleId: "",
        password: "",
        confirmPassword: "",
      })
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
      <DialogContent className="sm:max-w-[550px] bg-background border-input overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-primary/10 rounded-lg">
                <UserIcon className="h-5 w-5 text-primary" />
             </div>
             <DialogTitle className="text-xl font-bold tracking-tight">
               {user ? "Edit User Account" : "Create New User"}
             </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {user 
              ? "Modify employee details and primary role assignment. Password management is handled separately." 
              : "Provision a new user account with a primary role and initial credentials."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: ControllerRenderProps<UserFormValues, "name"> }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-background border-input focus:border-primary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: ControllerRenderProps<UserFormValues, "email"> }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="john@example.com" 
                          {...field} 
                          disabled={!!user} // Email usually fixed or needs special flow
                          className="bg-background border-input focus:border-primary/50" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }: { field: ControllerRenderProps<UserFormValues, "roleId"> }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                       <ShieldIcon className="h-3 w-3 text-primary" />
                       Primary Role
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-input">
                          <SelectValue placeholder="Assign a security role" />
                        </SelectTrigger>
                      </FormControl>
                        <SelectContent className="bg-popover border-input max-h-[300px]">
                          {roles
                            .filter((r) => r.isAssignable !== false)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id.toString()}>
                                {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">Determines baseline access permissions</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password section only shown during creation */}
              {!user && (
                <div className="grid grid-cols-2 gap-4 border-t border-input pt-6">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }: { field: ControllerRenderProps<UserFormValues, "password"> }) => (
                      <FormItem>
                        <FormLabel>Set Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-background border-input focus:border-primary/50 pr-10"
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
                    render={({ field }: { field: ControllerRenderProps<UserFormValues, "confirmPassword"> }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-background border-input focus:border-primary/50 pr-10"
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
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-input mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-input hover:bg-muted/50 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px] rounded-xl shadow-lg shadow-primary/20"
              >
                {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : (user ? "Update User" : "Provision User")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
