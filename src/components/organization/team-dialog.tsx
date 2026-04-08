"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Layers, FolderPlus } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const teamFormSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters."),
})

type TeamFormValues = z.infer<typeof teamFormSchema>

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number
  team?: any
  onSuccess?: () => void
}

export function TeamDialog({
  open,
  onOpenChange,
  organizationId,
  team,
  onSuccess,
}: TeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || "",
    },
  })

  React.useEffect(() => {
    if (team) {
      form.reset({ name: team.name })
    } else {
      form.reset({ name: "" })
    }
  }, [team, form])

  async function onSubmit(values: TeamFormValues) {
    setIsSubmitting(true)
    try {
      if (team) {
        await apiClient(`/api/organisations/${organizationId}/teams/${team.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      } else {
        await apiClient(`/api/organisations/${organizationId}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      // apiClient already handled toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-background border-border/40 shadow-2xl overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
               <Layers className="size-5 text-primary" />
               {team ? "Edit Team" : "Add Team"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic leading-tight">
              {team 
                ? `Edit team: ${team.name}` 
                : "Add a new team to the organization."
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Team Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Industrial Logistics Hub" 
                        {...field} 
                        disabled={isSubmitting}
                        className="bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-bold text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t border-border/40 mt-8 -mx-6 px-6 bg-muted/5">
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-10 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderPlus className="mr-2 h-4 w-4" />
                  )}
                  {team ? "Save" : "Add Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
