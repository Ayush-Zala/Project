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
  roles: { id: number; name: string }[]
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-input">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldIcon className="h-5 w-5 text-primary" />
             </div>
             <DialogTitle className="text-xl font-bold tracking-tight">Modify Security Role</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground pb-2 border-b border-input">
            Select a new primary role for 
            <span className="font-bold text-foreground px-1">"{user?.name}"</span>. 
            This will immediately update their access level.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }: { field: ControllerRenderProps<FormValues, "roleId"> }) => (
                <FormItem>
                  <FormLabel>Security Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-input">
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-8 gap-2 sm:gap-0 pt-4 border-t border-input">
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
                {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
