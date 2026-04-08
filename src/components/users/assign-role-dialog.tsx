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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon, ShieldIcon } from "lucide-react"

const schema = z.object({
  roleId: z.string().min(1, "Please select a role"),
})

type FormValues = z.infer<typeof schema>

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
  roles: { id: number; name: string; slug?: string }[]
  onSuccess: () => void
}

export function AssignRoleDialog({ open, onOpenChange, user, roles, onSuccess }: AssignRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roleId: "",
    },
  })

  React.useEffect(() => {
    if (user) {
      form.reset({
        roleId: user.role?.id?.toString() || "",
      })
    }
  }, [user, form])

  async function onSubmit(values: FormValues) {
    if (!user) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/users/${user.id}/assign-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: parseInt(values.roleId)
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign role")
      }

      toast.success(`Role for ${user.name} updated successfully`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🛡️ Hierarchy Filter: Never show Super Admin as a target for reassignment
  const filteredRoles = React.useMemo(() => {
    return roles.filter(r => r.slug !== 'super-admin')
  }, [roles])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-background border-input p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-6">
             <DialogTitle className="text-xl font-black uppercase tracking-tight">
               Modify Role: {user?.name}
             </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }: { field: ControllerRenderProps<FormValues, "roleId"> }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Target Security Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-input h-10 font-bold text-xs transition-all">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-input max-h-[250px]">
                        {filteredRoles.map((r) => (
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
                    {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
