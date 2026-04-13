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
import { useWorkspace } from "@/hooks/use-workspace"
import { Loader2, Plus, Trash2, Building, Globe, MapPin, Contact2, Phone, Mail, Link as LinkIcon, UserPlus } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  isPrimary: z.boolean(),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.trim().length > 0), {
  message: "Specific type is required",
  path: ["otherType"],
})

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

const companyFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industryId: z.string().min(1, "Industry is required"),
  source: z.string().min(1, "Source is required"),
  otherSource: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contacts: z.array(companyContactSchema).min(1, "At least one contact is required"),
  // 🛡️ Compulsory Client Section
  client: z.object({
    fullName: z.string().min(2, "Client name must be at least 2 characters"),
    designation: z.string().min(1, "Designation is required"),
    contacts: z.array(clientContactSchema).min(1, "Required"),
    socials: z.array(clientSocialSchema),
  })
}).refine(data => data.source !== "OTHER" || (data.otherSource && data.otherSource.trim().length > 0), {
  message: "Specific source description is required",
  path: ["otherSource"],
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

interface CompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: any // For editing
  onSuccess?: () => void
}

const SOURCES = [
  "REFERRAL", "COLD_CALL", "COLD_EMAIL", "LINKEDIN", "WEBSITE", "CONFERENCE", "PAID_AD", "CONTENT_MARKETING", "PARTNER", "OTHER"
]

const CONTACT_TYPES = [
  "MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"
]
const SOCIAL_PLATFORMS = [
  "LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"
]

export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [industries, setIndustries] = React.useState<any[]>([])
  const { data: activeOrg } = useWorkspace()

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      website: "",
      industryId: "",
      source: "OTHER",
      otherSource: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      contacts: [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
      client: {
        fullName: "",
        designation: "",
        contacts: [{ type: "EMAIL", otherType: "", value: "", isPrimary: true }],
        socials: [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
      }
    },
  })

  // Company Contacts
  const { fields: companyContacts, append: appendCompanyContact, remove: removeCompanyContact } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  // Client Contacts
  const { fields: clientContacts, append: appendClientContact, remove: removeClientContact } = useFieldArray({
    control: form.control,
    name: "client.contacts",
  })

  // Client Socials
  const { fields: clientSocials, append: appendClientSocial, remove: removeClientSocial } = useFieldArray({
    control: form.control,
    name: "client.socials",
  })

  // Load industries
  React.useEffect(() => {
    if (open) {
      apiClient("/api/industries").then(setIndustries).catch(() => { })
    }
  }, [open])

  // Reset form when company changes
  React.useEffect(() => {
    if (company && open) {
      form.reset({
        name: company.name,
        website: company.website || "",
        industryId: String(company.industryId),
        source: company.source,
        otherSource: company.otherSource || "",
        addressLine1: company.addressLine1 || "",
        addressLine2: company.addressLine2 || "",
        city: company.city || "",
        state: company.state || "",
        country: company.country || "",
        postalCode: company.postalCode || "",
        contacts: company.contacts?.length > 0
          ? company.contacts.map((c: any) => ({ type: c.type, otherType: c.otherType || "", value: c.value, isPrimary: c.isPrimary }))
          : [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
        client: {
          fullName: "",
          designation: "",
          contacts: [{ type: "EMAIL", otherType: "", value: "", isPrimary: true }],
          socials: [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
        }
      })
    } else if (!company && open) {
      form.reset({
        name: "",
        website: "",
        industryId: "",
        source: "OTHER",
        otherSource: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        contacts: [{ type: "MOBILE", otherType: "", value: "", isPrimary: true }],
        client: {
          fullName: "",
          designation: "",
          contacts: [{ type: "EMAIL", otherType: "", value: "", isPrimary: true }],
          socials: [{ platform: "LINKEDIN", otherPlatform: "", url: "" }],
        }
      })
    }
  }, [company, open, form])

  async function onSubmit(values: CompanyFormValues) {
    if (!activeOrg?.id) return
    setIsSubmitting(true)
    const toastId = toast.loading(company ? "Updating company..." : "Adding company...")

    const payload = {
      ...values,
      industryId: Number(values.industryId),
    }

    try {
      if (company) {
        // Note: For now, edit company doesn't edit the client via this modal
        // since we only require client on CREATE as per current instruction.
        const { client, ...updatePayload } = payload;
        await apiClient(`/api/companies/${company.id}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        })
      } else {
        await apiClient(`/api/organisations/${activeOrg.id}/companies`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      toast.success(company ? "Company updated" : "Company added", { id: toastId })
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
              {company ? "Edit Company" : "Add Company"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} className="h-9 text-xs font-bold uppercase tracking-tight" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://acme.com" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industryId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Industry *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs font-bold uppercase tracking-tighter">
                            <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {industries.map((ind) => (
                            <SelectItem key={ind.id} value={String(ind.id)} className="text-xs font-bold uppercase tracking-tighter">
                              {ind.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Source *</FormLabel>
                      <div className="space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs font-bold uppercase tracking-tighter">
                              <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs font-bold uppercase tracking-tighter">
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {field.value === "OTHER" && (
                          <FormField
                            control={form.control}
                            name="otherSource"
                            render={({ field: otherField }) => (
                              <FormItem className="animate-in slide-in-from-top-1 duration-200">
                                <FormControl>
                                  <Input 
                                    placeholder="Specify other source..." 
                                    {...otherField} 
                                    className="h-8 text-[10px] border-primary/20 bg-background/5 rounded-lg" 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <FormMessage className="text-[9px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Street Address" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite, Unit, etc." {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="Zip" {...field} className="h-9 text-xs font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-border/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/70">Company Contacts</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => appendCompanyContact({ type: "MOBILE", value: "", isPrimary: companyContacts.length === 0 })}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest font-bold"
                  >
                    + Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {companyContacts.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.type` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1 max-w-[100px] space-y-0">
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
                                          placeholder="Type..." 
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
                              <Input placeholder="Value" {...field} className="h-8 text-xs font-bold" />
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
                                  className="size-3 accent-primary cursor-pointer"
                                />
                              </FormControl>
                              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Primary</span>
                            </FormItem>
                          )}
                        />
                        {companyContacts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCompanyContact(index)}
                            className="size-6 text-muted-foreground/30 hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🛡️ Compulsory Primary Client Section */}
              {!company && (
                <div className="pt-8 border-t-2 border-primary/20 bg-primary/5 -mx-6 px-6 pb-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Primary Client Registration</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="client.fullName"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary/70">Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Lead Contact" {...field} className="h-9 text-xs font-bold uppercase border-primary/20 bg-background" />
                          </FormControl>
                          <FormMessage className="text-[9px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.designation"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary/70">Designation *</FormLabel>
                          <FormControl>
                            <Input placeholder="Decision Maker" {...field} className="h-9 text-xs font-bold uppercase border-primary/20 bg-background" />
                          </FormControl>
                          <FormMessage className="text-[9px] font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Client Contacts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3" /> Communication Channels *
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => appendClientContact({ type: "EMAIL", value: "", isPrimary: clientContacts.length === 0 })}
                        className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                      >
                        + Add Channel
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {clientContacts.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-end">
                          <FormField
                            control={form.control}
                            name={`client.contacts.${index}.type` as const}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[90px] space-y-0">
                                  <div className="space-y-1.5">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-[9px] font-black uppercase bg-background border-primary/10">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {CONTACT_TYPES.map((t) => (
                                          <SelectItem key={t} value={t} className="text-[9px] font-black uppercase">
                                            {t.replace("_", " ")}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {field.value === "OTHER" && (
                                      <FormField
                                        control={form.control}
                                        name={`client.contacts.${index}.otherType` as const}
                                        render={({ field: otherField }) => (
                                          <FormItem className="animate-in slide-in-from-top-1 duration-200">
                                            <FormControl>
                                              <Input 
                                                placeholder="Type..." 
                                                {...otherField} 
                                                className="h-6 text-[8px] border-primary/20 bg-background/5 rounded-md" 
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
                            name={`client.contacts.${index}.value` as const}
                            render={({ field }) => (
                              <FormItem className="flex-[2] space-y-0">
                                <FormControl>
                                  <Input placeholder="Contact Value" {...field} className="h-8 text-xs font-bold bg-background border-primary/10" />
                                </FormControl>
                                <FormMessage className="text-[8px]" />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-center gap-2 h-8">
                            <FormField
                              control={form.control}
                              name={`client.contacts.${index}.isPrimary` as const}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-1.5">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          form.setValue('client.contacts', form.getValues('client.contacts').map((c, i) => ({ ...c, isPrimary: i === index })))
                                        }
                                      }}
                                      className="size-3 accent-primary cursor-pointer"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {clientContacts.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeClientContact(index)} className="size-6 text-muted-foreground/30 hover:text-destructive">
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Client Socials */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Globe className="size-3" /> Social Profiles
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => appendClientSocial({ platform: "LINKEDIN", url: "" })}
                        className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                      >
                        + Add Social
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {clientSocials.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-end">
                          <FormField
                            control={form.control}
                            name={`client.socials.${index}.platform` as const}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[110px] space-y-0">
                                  <div className="space-y-1.5">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-[9px] font-black uppercase bg-background border-primary/10">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {SOCIAL_PLATFORMS.map((p) => (
                                          <SelectItem key={p} value={p} className="text-[9px] font-black uppercase">
                                            {p.replace("_", " ")}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {field.value === "OTHER" && (
                                      <FormField
                                        control={form.control}
                                        name={`client.socials.${index}.otherPlatform` as const}
                                        render={({ field: otherField }) => (
                                          <FormItem className="animate-in slide-in-from-top-1 duration-200">
                                            <FormControl>
                                              <Input 
                                                placeholder="Platform..." 
                                                {...otherField} 
                                                className="h-6 text-[8px] border-primary/20 bg-background/5 rounded-md" 
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
                            name={`client.socials.${index}.url` as const}
                            render={({ field }) => (
                              <FormItem className="flex-[3] space-y-0">
                                <FormControl>
                                  <Input placeholder="Profile URL" {...field} className="h-8 text-xs font-medium bg-background border-primary/10" />
                                </FormControl>
                                <FormMessage className="text-[8px]" />
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeClientSocial(index)} className="size-8 text-muted-foreground/30 hover:text-destructive h-8">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-8 h-10 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    company ? "Save Changes" : "Create Company"
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
