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
import { Loader2, Plus, Trash2, Building, Globe, MapPin, Contact2, Phone, Mail, Link as LinkIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Value is required"),
  isPrimary: z.boolean(),
})

const companyFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industryId: z.string().min(1, "Industry is required"),
  source: z.string().min(1, "Source is required"),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contacts: z.array(companyContactSchema).min(1, "At least one contact is required"),
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

export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [industries, setIndustries] = React.useState<any[]>([])
  const { data: activeOrg } = authClient.useActiveOrganization()

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      website: "",
      industryId: "",
      source: "OTHER",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      contacts: [{ type: "MOBILE", value: "", isPrimary: true }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
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
        addressLine1: company.addressLine1 || "",
        addressLine2: company.addressLine2 || "",
        city: company.city || "",
        state: company.state || "",
        country: company.country || "",
        postalCode: company.postalCode || "",
        contacts: company.contacts?.length > 0
          ? company.contacts.map((c: any) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary }))
          : [{ type: "MOBILE", value: "", isPrimary: true }],
      })
    } else if (!company && open) {
      form.reset({
        name: "",
        website: "",
        industryId: "",
        source: "OTHER",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        contacts: [{ type: "MOBILE", value: "", isPrimary: true }],
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
        await apiClient(`/api/companies/${company.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
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
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/70">Contacts</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append({ type: "MOBILE", value: "", isPrimary: fields.length === 0 })}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest"
                  >
                    + Add Channel
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.type` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1 max-w-[100px] space-y-0">
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
                                  className="size-3 accent-primary"
                                />
                              </FormControl>
                              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Primary</span>
                            </FormItem>
                          )}
                        />
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
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
