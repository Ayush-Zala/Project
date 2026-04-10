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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, MailPlus, Shield, Info } from "lucide-react"
import { getAvailableRoles } from "@/lib/security-rules"
import { apiClient } from "@/lib/api-client"

const memberFormSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["owner", "member"], {
    message: "Role is mandatory.",
  }),
})

type MemberFormValues = z.infer<typeof memberFormSchema>

interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  member?: any // For editing
  onSuccess?: () => void
}

export function MemberDialog({
  open,
  onOpenChange,
  organizationId,
  member,
  onSuccess,
}: MemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: member?.user?.email || "",
      role: member?.role || "member",
    },
  })

  // Reset form when member changes
  React.useEffect(() => {
    if (member) {
      form.reset({
        email: member.user.email,
        role: member.role,
      })
    } else {
      form.reset({
        email: "",
        role: "member",
      })
    }
  }, [member, form])

  async function onSubmit(values: MemberFormValues) {
    setIsSubmitting(true)
    
    try {
      if (member) {
        // Update member via industrial API
        await apiClient(`/api/organisations/${organizationId}/members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      } else {
        // Invite/Add via industrial API
        await apiClient(`/api/organisations/${organizationId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })
      }

      onSuccess?.()
      form.reset() // 🧹 Clear form after successful industrial member addition
      onOpenChange(false)
    } catch (error: any) {
      // apiClient already handled the toast for non-GET errors
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
               {member ? "Edit Member" : "Add Member"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      Email address <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="operator@obsidian-noir.com" 
                        {...field} 
                        disabled={!!member || isSubmitting}
                        className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      Administrative Role <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={isSubmitting || !!member}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background border-input focus:border-primary/50 font-bold uppercase text-[10px] tracking-widest h-10 disabled:opacity-70 disabled:bg-muted/10">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-input">
                        {getAvailableRoles(!!member, member?.role).map((role) => (
                          <SelectItem 
                            key={role} 
                            value={role} 
                            className="font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 transition-colors"
                          >
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {member && (
                        <p className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/40 uppercase italic tracking-tighter mt-1.5">
                            Security Protocol: Role stays fixed after assignment.
                        </p>
                    )}
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
                    member ? "Save Changes" : "Add"
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
