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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Loader2, Building2, Globe, Hash, Info } from "lucide-react"
import { slugify } from "@/lib/utils"

const orgFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters.").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens."),
  logo: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  description: z.string().optional(),
})

type OrgFormValues = z.infer<typeof orgFormSchema>

interface OrganisationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organisation?: any // For editing
  onSuccess?: () => void
}

export function OrganisationDialog({
  open,
  onOpenChange,
  organisation,
  onSuccess,
}: OrganisationDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: organisation?.name || "",
      slug: organisation?.slug || "",
      logo: organisation?.logo || "",
      description: organisation?.description || "",
    },
  })

  // 🔄 Industrial Sync: Auto-generate slug from legal name
  const name = form.watch("name")
  React.useEffect(() => {
    if (!organisation) {
      const generatedSlug = slugify(name)
      form.setValue("slug", generatedSlug)
      
      // Clear errors once it becomes valid
      if (generatedSlug.length >= 2) {
        form.clearErrors("slug")
      }
    }
  }, [name, form, organisation])

  // Reset form when organisation changes
  React.useEffect(() => {
    if (organisation) {
      form.reset({
        name: organisation.name,
        slug: organisation.slug,
        logo: organisation.logo || "",
        description: organisation.description || "",
      })
    } else {
      form.reset({
        name: "",
        slug: "",
        logo: "",
        description: "",
      })
    }
  }, [organisation, form])

  async function onSubmit(values: OrgFormValues) {
    setIsSubmitting(true)
    const toastId = toast.loading(organisation ? "Saving..." : "Adding...")

    // 🏗️ Clean Protocol: Use dedicated description column
    const payload = {
      name: values.name,
      slug: values.slug,
      logo: values.logo,
      description: values.description
    }

    try {
      if (organisation) {
        const { data, error } = await authClient.organization.update({
          organizationId: String(organisation.id),
          data: payload,
        })
        if (error) throw new Error(error.message || "Update failed")
      } else {
        // 🛡️ Clean Creation Protocol: Bypass default provisioning
        const response = await fetch("/api/organisations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to create organization")
        }
      }

      toast.success(organisation ? "Organization saved" : "Organization added", { id: toastId })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
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
               {organisation ? "Edit Organization" : "Add Organization"}
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Organization Name <span className="text-red-500 font-bold">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Obsidianoir Industries" 
                          {...field} 
                          disabled={isSubmitting}
                          className="bg-background border-input focus:border-primary/50 font-bold transition-all text-sm h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Industrial-grade workspace for autonomous manufacturing..." 
                          {...field} 
                          disabled={isSubmitting}
                          className="resize-none bg-background border-input focus:border-primary/50 min-h-[80px] font-medium transition-all text-xs py-3"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Logo URL
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://cdn.industries.com/logo.png" 
                          {...field} 
                          disabled={isSubmitting}
                          className="bg-background border-input focus:border-primary/50 font-medium transition-all text-xs h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-red-500" />
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
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    organisation ? "Save Changes" : "Create Organization"
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
