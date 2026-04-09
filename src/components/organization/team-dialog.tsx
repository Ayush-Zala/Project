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
  organizationId: string
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
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
               {team ? "Edit Team" : "Add Team"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Team Name <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Industrial Logistics Hub" 
                        {...field} 
                        disabled={isSubmitting}
                        className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
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
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    team ? "Save Changes" : "Add Team"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
