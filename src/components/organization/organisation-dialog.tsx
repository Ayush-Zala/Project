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
      <DialogContent className="sm:max-w-[450px] bg-background border-border/40 shadow-2xl overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
               <Building2 className="size-5 text-primary" />
               {organisation ? "Edit Organization" : "Add Organization"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 italic leading-tight">
              {organisation 
                ? `Update settings for ${organisation.name}` 
                : "Add a new organization to your workspace."
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                        Name <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Obsidianoir Industries" 
                        {...field} 
                        disabled={isSubmitting}
                        className="bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-bold text-sm tracking-tight"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
                            <Hash className="size-3" /> Slug <span className="text-red-500 font-bold">*</span>
                        </FormLabel>
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="obsidian-noir" 
                        {...field} 
                        readOnly={!organisation}
                        disabled={isSubmitting}
                        className={`bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-mono text-xs font-bold ${!organisation ? 'cursor-not-allowed opacity-70 border-dashed' : ''}`}
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
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
                        <Info className="size-3" /> Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Industrial-grade workspace for autonomous manufacturing..." 
                        {...field} 
                        disabled={isSubmitting}
                        className="bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-medium text-xs min-h-[80px] resize-none"
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
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
                        <Globe className="size-3" /> Logo URL
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://cdn.industries.com/logo.png" 
                        {...field} 
                        disabled={isSubmitting}
                        className="bg-muted/10 border-border/50 focus:border-primary/50 transition-all font-medium text-xs"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t border-border/40 mt-8 -mx-6 px-6 bg-muted/5">
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-11 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Building2 className="mr-2 h-4 w-4" />
                  )}
                  {organisation ? "Save Changes" : "Create Organization"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
