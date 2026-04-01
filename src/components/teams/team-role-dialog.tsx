"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon, ShieldCheckIcon } from "lucide-react"

const teamRoleSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50),
  description: z.string().max(255).optional().nullable(),
})

type TeamRoleFormValues = z.infer<typeof teamRoleSchema>

interface TeamRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  role?: any
  onSuccess: () => void
}

export function TeamRoleDialog({ open, onOpenChange, teamId, role, onSuccess }: TeamRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<TeamRoleFormValues>({
    resolver: zodResolver(teamRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  React.useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description || "",
      })
    } else {
      form.reset({
        name: "",
        description: "",
      })
    }
  }, [role, form, open])

  async function onSubmit(values: TeamRoleFormValues) {
    setIsSubmitting(true)
    try {
      const url = role 
        ? `/api/teams/${teamId}/roles/${role.id}` 
        : `/api/teams/${teamId}/roles`
      const method = role ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to provision role")
      }

      toast.success(role ? "Team role updated" : "Local role provisioned successfully")
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
      <DialogContent className="sm:max-w-[480px] bg-popover/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {role ? "Edit Team Role" : "Provision Local Role"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground/80">
            {role 
              ? "Modify the localized authority manifest for this team role." 
              : "Define a new set of capabilities specifically for this organizational unit."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Role Identity</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Project Lead / Auditor" 
                      className="bg-background/50 border-border/40 focus:border-primary/50 rounded-xl" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Capability Scope</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the permissions associated with this local role..." 
                      className="bg-background/50 border-border/40 focus:border-primary/50 min-h-[100px] resize-none rounded-xl" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-medium" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all flex gap-2 active:scale-95"
              >
                {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
                {role ? "Update Manifest" : "Provision Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
