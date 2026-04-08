"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

const teamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters").max(50),
  description: z.string().max(255).optional().nullable(),
})

type TeamFormValues = z.infer<typeof teamSchema>

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: any
  onSuccess: () => void
}

export function TeamDialog({ open, onOpenChange, team, onSuccess }: TeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  React.useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        description: team.description || "",
      })
    } else {
      form.reset({
        name: "",
        description: "",
      })
    }
  }, [team, form, open])

  async function onSubmit(values: TeamFormValues) {
    setIsSubmitting(true)
    try {
      const url = team ? `/api/teams/${team.id}` : "/api/teams"
      const method = team ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save team")
      }

      toast.success(team ? "Team updated" : "Team created successfully")
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
      <DialogContent className="sm:max-w-[480px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {team ? "Edit Team" : "Create New Team"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Industrial Engineering" {...field} className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a brief overview of this team's purpose" 
                          className="resize-none bg-background border-input focus:border-primary/50 min-h-[80px] font-medium transition-all text-xs py-3" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
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
                    {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : (team ? "Save Changes" : "Create Team")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
