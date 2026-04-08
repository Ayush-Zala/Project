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
  organizationId: number
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
      onOpenChange(false)
    } catch (error: any) {
      // apiClient already handled the toast for non-GET errors
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border/40 shadow-2xl overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
               <Shield className="size-5 text-primary" />
               {member ? "Edit Member" : "Add Member"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic leading-tight">
              {member 
                ? `Edit role for ${member.user.email}` 
                : "Add a new member to the organization."
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="operator@obsidian-noir.com" 
                        {...field} 
                        disabled={!!member || isSubmitting}
                        className="bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={isSubmitting || !!member}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-muted/10 border-border/50 font-bold uppercase text-[10px] tracking-widest disabled:opacity-70 disabled:bg-muted/20">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {getAvailableRoles(!!member, member?.role).map((role) => (
                          <SelectItem 
                            key={role} 
                            value={role} 
                            className={`font-bold text-[10px] uppercase tracking-wider focus:bg-primary/10 ${
                              role === 'owner' ? 'text-amber-600 focus:bg-amber-500/10' : 'text-emerald-600 focus:bg-emerald-500/10'
                            }`}
                          >
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {member && (
                        <p className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/50 uppercase italic tracking-tighter mt-1">
                            <Info className="size-2.5" />
                            Security Protocol: Role stays fixed after assignment.
                        </p>
                    )}
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t border-border/40 mt-6 -mx-6 px-6 bg-muted/5">
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-10 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="mr-2 h-4 w-4" />
                  )}
                  {member ? "Save" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
