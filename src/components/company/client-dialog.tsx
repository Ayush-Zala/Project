"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { authClient } from "@/lib/auth-client"
import { Loader2, Plus, Trash2, User, UserPlus, Briefcase, Contact2, Phone, Mail, Globe, Share2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  isPrimary: z.boolean(),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.trim().length > 0), {
  message: "Specific type is required",
  path: ["otherType"],
})

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  otherPlatform: z.string().optional(),
  url: z.string().url("Valid URL is required"),
}).refine(data => data.platform !== "OTHER" || (data.otherPlatform && data.otherPlatform.trim().length > 0), {
  message: "Platform name is required",
  path: ["otherPlatform"],
})

const clientFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  designation: z.string().optional().or(z.literal("")),
  companyId: z.string().min(1, "Company is required"),
  contacts: z.array(clientContactSchema),
  socials: z.array(clientSocialSchema),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

interface ClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: any // For editing
  defaultCompanyId?: string
  onSuccess?: () => void
}

const CONTACT_TYPES = [
  "MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"
]

const SOCIAL_PLATFORMS = [
  "LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"
]

export function ClientDialog({
  open,
  onOpenChange,
  client,
  defaultCompanyId,
  onSuccess,
}: ClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [companies, setCompanies] = React.useState<any[]>([])
  const { data: activeOrg } = authClient.useActiveOrganization()

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: "",
      designation: "",
      companyId: "",
      contacts: [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
      socials: [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
    },
  })

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control: form.control,
    name: "socials",
  })

  // Load companies
  React.useEffect(() => {
    if (open && activeOrg?.id) {
      const params = new URLSearchParams()
      params.set("per_page", "1000")
      params.set("filters", JSON.stringify([{ id: "isActive", value: true, operator: "equals" }]))

      apiClient(`/api/organisations/${activeOrg.id}/companies?${params.toString()}`)
        .then(data => {
          setCompanies(data.companies || [])
        })
        .catch((err) => {
          console.error("Failed to fetch companies:", err)
        })
    }
  }, [open, activeOrg?.id])

  // Reset form when client changes
  React.useEffect(() => {
    if (client && open) {
      form.reset({
        fullName: client.fullName,
        designation: client.designation || "",
        companyId: String(client.companyId),
        contacts: client.contacts?.length > 0
          ? client.contacts.map((c: any) => ({ type: c.type, otherType: c.otherType || "", value: c.value, isPrimary: c.isPrimary }))
          : [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
        socials: client.socials?.length > 0
          ? client.socials.map((s: any) => ({ platform: s.platform, otherPlatform: s.otherPlatform || "", url: s.url }))
          : [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
      })
    } else if (!client && open) {
      form.reset({
        fullName: "",
        designation: "",
        companyId: defaultCompanyId || "",
        contacts: [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
        socials: [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
      })
    }
  }, [client, open, form, defaultCompanyId])

  async function onSubmit(values: ClientFormValues) {
    setIsSubmitting(true)
    const toastId = toast.loading(client ? "Updating client details..." : "Registering client...")

    const payload = {
      ...values,
      companyId: Number(values.companyId),
    }

    try {
      if (client) {
        await apiClient(`/api/clients/${client.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await apiClient(`/api/companies/${values.companyId}/clients`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      toast.success(client ? "Client updated" : "Client registered", { id: toastId })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      // apiClient handles toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-background border-input selection:bg-primary/30 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />

        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {client ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="h-9 text-xs font-bold uppercase" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Architect" {...field} value={field.value || ""} className="h-9 text-xs font-medium" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Associated Company *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val)}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs font-bold uppercase tracking-tighter">
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-xs font-bold uppercase">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[9px] font-bold" />
                  </FormItem>
                )}
              />

              {/* Contacts Block */}
              <div className="pt-4 border-t border-border/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/70">Communication Channels</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => appendContact({ type: "EMAIL", value: "", isPrimary: contactFields.length === 0 })}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest"
                  >
                    + Add Channel
                  </Button>
                </div>

                <div className="space-y-3">
                  {contactFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.type` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1 max-w-[100px] space-y-0 text-[10px]">
                            <div className="space-y-1.5">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 text-[10px] font-bold uppercase">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CONTACT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">
                                      {t.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {field.value === "OTHER" && (
                                <FormField
                                  control={form.control}
                                  name={`contacts.${index}.otherType` as const}
                                  render={({ field: otherField }) => (
                                    <FormItem className="animate-in slide-in-from-top-1 duration-200">
                                      <FormControl>
                                        <Input
                                          placeholder="Contact Type..."
                                          {...otherField}
                                          className="h-6 text-[9px] border-primary/20 bg-background/5 rounded-md"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.value` as const}
                        render={({ field }) => (
                          <FormItem className="flex-[2] space-y-0">
                            <FormControl>
                              <Input placeholder="Enter value" {...field} className="h-8 text-xs font-bold" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center gap-2 h-8">
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.isPrimary` as const}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-1.5">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      form.setValue('contacts', form.getValues('contacts').map((c, i) => ({ ...c, isPrimary: i === index })))
                                    }
                                  }}
                                  className="size-3 accent-primary"
                                />
                              </FormControl>
                              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Primary</span>
                            </FormItem>
                          )}
                        />
                        {contactFields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)} className="size-6 text-muted-foreground/30 hover:text-destructive">
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Socials Block */}
              <div className="pt-4 border-t border-border/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/70">Social Profiles</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => appendSocial({ platform: "LINKEDIN", url: "" })}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest"
                  >
                    + Add Social
                  </Button>
                </div>

                <div className="space-y-3">
                  {socialFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`socials.${index}.platform` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1 max-w-[120px] space-y-0">
                            <div className="space-y-1.5">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-tight">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SOCIAL_PLATFORMS.map((p) => (
                                    <SelectItem key={p} value={p} className="text-[10px] font-bold uppercase">
                                      {p.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {field.value === "OTHER" && (
                                <FormField
                                  control={form.control}
                                  name={`socials.${index}.otherPlatform` as const}
                                  render={({ field: otherField }) => (
                                    <FormItem className="animate-in slide-in-from-top-1 duration-200">
                                      <FormControl>
                                        <Input
                                          placeholder="Social Platform..."
                                          {...otherField}
                                          className="h-6 text-[9px] border-primary/20 bg-background/5 rounded-md"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`socials.${index}.url` as const}
                        render={({ field }) => (
                          <FormItem className="flex-[3] space-y-0">
                            <FormControl>
                              <Input placeholder="Profile URL" {...field} className="h-8 text-xs font-medium" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSocial(index)} className="size-8 text-muted-foreground/30 hover:text-destructive h-8">
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-10 h-10 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    client ? "Save Changes" : "Create Client"
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
