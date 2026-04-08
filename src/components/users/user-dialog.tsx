"use client"

import * as React from "react"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
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
  roles: { id: number; name: string; slug: string; isAssignable?: boolean }[]
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
      <DialogContent className="sm:max-w-[500px] bg-background border-input overflow-hidden p-0 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {user ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }: { field: ControllerRenderProps<UserFormValues, "name"> }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10" />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }: { field: ControllerRenderProps<UserFormValues, "email"> }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="john@example.com"
                            {...field}
                            disabled={!!user}
                            className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }: { field: ControllerRenderProps<UserFormValues, "roleId"> }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Primary Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-input h-10 font-bold text-xs transition-all">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-input max-h-[250px]">
                          {roles
                            .filter((r) => r.isAssignable !== false && r.slug !== 'super-admin')
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id.toString()} className="text-[11px] font-bold uppercase tracking-tight">
                                {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                {!user && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }: { field: ControllerRenderProps<UserFormValues, "password"> }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                className="bg-background border-input focus:border-primary/50 pr-10 font-bold text-sm h-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }: { field: ControllerRenderProps<UserFormValues, "confirmPassword"> }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Confirm</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                className="bg-background border-input focus:border-primary/50 pr-10 font-bold text-sm h-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-6 border-t border-border/10 -mx-6 px-6 bg-muted/5 mt-6 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-10 text-[11px] font-black uppercase tracking-widest hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : (user ? "Save Changes" : "Create User")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
