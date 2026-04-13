"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { authClient } from "@/lib/auth-client"
import { Loader2, Plus, Trash2, Building, Globe, MapPin, Mail, UserPlus, ArrowLeft, Search, Check, ChevronDown } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Value is required"),
  isPrimary: z.boolean(),
}).superRefine((data, ctx) => {
  const { type, value } = data;
  if (!value) return;

  // 📧 Email Validation
  if ((type === "EMAIL" || type === "WORK_EMAIL" || value.includes("@")) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid email format",
      path: ["value"],
    });
  }

  // 📞 Numeric Validation for Phones
  if (["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "WHATSAPP"].includes(type) && !/^[0-9+\s-()]+$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Numeric value required",
      path: ["value"],
    });
  }
})

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().optional().or(z.literal("")),
  isPrimary: z.boolean(),
}).superRefine((data, ctx) => {
  const { type, value } = data;
  if (!value) return;

  if ((type === "EMAIL" || type === "WORK_EMAIL" || value.includes("@")) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid email format",
      path: ["value"],
    });
  }

  if (["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "WHATSAPP"].includes(type) && !/^[0-9+\s-()]+$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Numeric value required",
      path: ["value"],
    });
  }
})

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  url: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  const { url } = data;
  if (url && !url.startsWith("http") && !url.includes(".")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid URL format",
      path: ["url"],
    });
  }
})

export const companyFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  website: z.string().url("Valid URL starting with https:// is required").optional().or(z.literal("")),
  industryId: z.string().min(1, "Industry selection is required"),
  source: z.enum(["REFERRAL", "COLD_CALL", "COLD_EMAIL", "LINKEDIN", "WEBSITE", "CONFERENCE", "PAID_AD", "CONTENT_MARKETING", "PARTNER", "OTHER"]),
  addressLine1: z.string().min(1, "Physical address is required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country selection is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  contacts: z.array(companyContactSchema).min(1, "At least one contact channel is required"),
  clients: z.array(z.object({
    fullName: z.string().optional().or(z.literal("")),
    designation: z.string().optional().or(z.literal("")),
    contacts: z.array(clientContactSchema).default([]),
    socials: z.array(clientSocialSchema).default([]),
  })).default([{
    fullName: "",
    designation: "",
    contacts: [{ type: "EMAIL", value: "", isPrimary: true }],
    socials: [{ platform: "LINKEDIN", url: "" }],
  }])
})

export type CompanyFormValues = {
  name: string;
  website?: string;
  industryId: string;
  source: "REFERRAL" | "COLD_CALL" | "COLD_EMAIL" | "LINKEDIN" | "WEBSITE" | "CONFERENCE" | "PAID_AD" | "CONTENT_MARKETING" | "PARTNER" | "OTHER" | "";
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contacts: { type: any; value: string; isPrimary: boolean }[];
  clients: {
    fullName: string;
    designation: string;
    contacts: { type: any; value: string; isPrimary: boolean }[];
    socials: { platform: any; url: string }[];
  }[];
}

interface CompanyFormProps {
  initialData?: any
  onSuccess?: () => void
  isEdit?: boolean
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

export function CompanyForm({
  initialData,
  onSuccess,
  isEdit = false,
}: CompanyFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [industries, setIndustries] = React.useState<any[]>([])
  const [industrySearch, setIndustrySearch] = React.useState("")
  const [isIndustryOpen, setIsIndustryOpen] = React.useState(false)
  const { data: activeOrg } = authClient.useActiveOrganization()

  // Dynamic schema refinement based on mode
  const refinedSchema = React.useMemo(() => {
    return companyFormSchema.superRefine((data, ctx) => {
      // Enforce client details validation (Add & Edit modes)
      data.clients.forEach((client, index) => {
        if (!client.fullName || client.fullName.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Client name is required",
            path: ["clients", index, "fullName"],
          });
        }
        if (!client.designation || client.designation.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Client designation is required",
            path: ["clients", index, "designation"],
          });
        }
        // Contacts validation for Stakeholders
        const hasContact = client.contacts?.some(c => c.value && c.value.length > 0);
        if (!hasContact) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Primary contact method required",
            path: ["clients", index, "contacts"],
          });
        }
      });
    });
  }, [isEdit]);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(refinedSchema) as any,
    defaultValues: React.useMemo(() => {
      const baseValues = {
        name: initialData?.name || "",
        website: initialData?.website || "",
        industryId: initialData?.industryId ? String(initialData.industryId) : "",
        source: initialData?.source || "",
        addressLine1: initialData?.addressLine1 || "",
        addressLine2: initialData?.addressLine2 || "",
        city: initialData?.city || "",
        state: initialData?.state || "",
        country: initialData?.country || "",
        postalCode: initialData?.postalCode || "",
        contacts: initialData?.contacts?.length > 0
          ? initialData.contacts.map((c: any) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary }))
          : [{ type: "MOBILE", value: "", isPrimary: true }],
        clients: initialData?.clients?.length > 0
          ? initialData.clients.map((client: any) => ({
            fullName: client.fullName,
            designation: client.designation,
            contacts: client.contacts?.length > 0
              ? client.contacts.map((c: any) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary }))
              : [{ type: "EMAIL", value: "", isPrimary: true }],
            socials: client.socials?.length > 0
              ? client.socials.map((s: any) => ({ platform: s.platform, url: s.url }))
              : [{ platform: "LINKEDIN", url: "" }],
          }))
          : [{
            fullName: "",
            designation: "",
            contacts: [{ type: "EMAIL", value: "", isPrimary: true }],
            socials: [{ platform: "LINKEDIN", url: "" }],
          }]
      }
      return baseValues
    }, [initialData]),
  })

  // Company Contacts
  const { fields: companyContacts, append: appendCompanyContact, remove: removeCompanyContact } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  // Clients (Multi-Stakeholder)
  const { fields: clientFields, append: appendClient, remove: removeClient } = useFieldArray({
    control: form.control,
    name: "clients",
  })

  // 🛡️ Verbose Feedback System
  const onValidationError = React.useCallback((errors: any) => {
    const errorPaths = Object.keys(errors);
    if (errorPaths.length > 0) {
      // 🚀 Aggressive Diagnostic Logging
      console.group("🏭 Industrial Ledger Validation Failure");
      console.error("Total Errors:", errorPaths.length);
      console.table(Object.entries(errors).map(([path, err]: any) => ({
        field: path,
        message: err.message || (err.root?.message) || "Nested Error (Check fields below)",
        type: err.type
      })));
      console.dir(errors);
      console.groupEnd();
    }
  }, []);

  // Load industries
  React.useEffect(() => {
    apiClient("/api/industries").then(setIndustries).catch(() => { })
  }, [])

  async function onSubmit(values: CompanyFormValues) {
    if (!activeOrg?.id) return
    setIsSubmitting(true)
    const toastId = toast.loading(isEdit ? "Updating company..." : "Adding company...")

    const payload = {
      ...values,
      industryId: Number(values.industryId),
    }

    try {
      if (isEdit && initialData) {
        // We include common fields. The API now handles optional client data.
        await apiClient(`/api/companies/${initialData.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await apiClient(`/api/organisations/${activeOrg.id}/companies`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      toast.success(isEdit ? "Company updated" : "Company added", { id: toastId })
      onSuccess?.()
    } catch (error: any) {
      // apiClient handles toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="font-sans bg-background border border-border/40 rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-2xl relative overflow-hidden group">
      {/* Aesthetic accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-50" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-6 sm:space-y-8 lg:space-y-12">

          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4 text-foreground">
              <Building className="size-5 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Company Details</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 pb-4 border-b border-border/5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="INDUSTRIAL GROUP INC." {...field} className="h-11 text-sm font-medium tracking-tight bg-muted/5 border-border/40 transition-all rounded-xl" />
                    </FormControl>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Website *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://industry.com" {...field} className="h-11 text-sm font-medium tracking-tight bg-muted/5 border-border/40 transition-all rounded-xl" />
                    </FormControl>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 pb-4 border-b border-border/5">
              <FormField
                control={form.control}
                name="industryId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Industry *</FormLabel>
                    <Popover open={isIndustryOpen} onOpenChange={setIsIndustryOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "h-11 w-full justify-between text-sm font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl px-4 hover:bg-muted/10 transition-all",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? industries.find((ind) => String(ind.id) === field.value)?.name
                              : "Search Industries..."}
                            <div className="flex items-center gap-2 text-muted-foreground/30">
                              <Search className="h-3.5 w-3.5" />
                              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </div>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[500px] p-0 border-border/40 shadow-2xl rounded-2xl overflow-hidden" align="start">
                        <div className="flex items-center border-b border-border/10 px-3 bg-muted/5">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                            placeholder="Type to filter industrial sectors..."
                            value={industrySearch}
                            onChange={(e) => setIndustrySearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-[300px] p-1 shadow-inner">
                          <div className="space-y-1">
                            {industries
                              .filter((ind) => ind.name.toLowerCase().includes(industrySearch.toLowerCase()))
                              .map((ind) => (
                                <div
                                  key={ind.id}
                                  onClick={() => {
                                    form.setValue("industryId", String(ind.id))
                                    setIsIndustryOpen(false)
                                    setIndustrySearch("")
                                  }}
                                  className={cn(
                                    "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-primary/5 group/item",
                                    String(ind.id) === field.value ? "bg-primary/10" : "hover:scale-[0.99]"
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={cn(
                                      "text-xs font-bold tracking-tight transition-colors",
                                      String(ind.id) === field.value ? "text-primary" : "text-foreground"
                                    )}>
                                      {ind.name}
                                    </span>
                                    {String(ind.id) === field.value && <Check className="h-3 w-3 text-primary animate-in zoom-in-50" />}
                                  </div>
                                  {ind.description && (
                                    <p className="hidden sm:block text-[10px] text-muted-foreground/60 leading-tight group-hover/item:text-muted-foreground/80 transition-colors line-clamp-2">
                                      {ind.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            {industries.filter((ind) => ind.name.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                              <div className="py-6 text-center text-[10px] text-muted-foreground font-medium italic">
                                No industrial sectors match your query...
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Lead Source *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full text-sm font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl">
                          <SelectValue placeholder="Choose source..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {SOURCES.map((source) => (
                          <SelectItem key={source} value={source} className="text-xs font-medium">
                            {source.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">

              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Industrial Way" {...field} className="h-11 text-sm font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite, Unit, Building, etc." {...field} className="h-11 text-sm font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} className="h-10 text-xs font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">State *</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} className="h-10 text-xs font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} className="h-10 text-xs font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Postal *</FormLabel>
                      <FormControl>
                        <Input placeholder="Zip" {...field} className="h-10 text-xs font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="pt-8 border-t border-border/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-foreground">
                  <Globe className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold tracking-tight">Company Contacts</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => appendCompanyContact({ type: "MOBILE", value: "", isPrimary: companyContacts.length === 0 })}
                  className="h-9 px-4 text-[11px] font-semibold tracking-tight bg-primary/5 hover:bg-primary text-primary rounded-xl hover:text-primary-foreground transition-all border border-primary/10"
                >
                  + Add Contact
                </Button>
              </div>

              <div className="space-y-4">
                {companyContacts.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 border-b border-border/5 pb-4 sm:border-0 sm:pb-0 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.type` as const}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 space-y-1.5">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 text-xs font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTACT_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-[10px] font-medium text-primary">
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
                        <FormItem className="sm:col-span-7 space-y-1.5">
                          <FormControl>
                            <Input placeholder="Contact Detail" {...field} className="h-11 text-sm font-medium tracking-tight bg-muted/5 border-border/40 rounded-xl" />
                          </FormControl>
                          <FormMessage className="text-[10px] font-medium" />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 h-11 pb-1">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.isPrimary` as const}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2.5 group/check cursor-pointer h-full">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    form.setValue('contacts', form.getValues('contacts').map((c, i) => ({ ...c, isPrimary: i === index })))
                                  }
                                }}
                              />
                            </FormControl>
                            <span className="text-[11px] font-semibold tracking-tight text-foreground/70 group-hover/check:text-primary transition-colors">Primary</span>
                          </FormItem>
                        )}
                      />
                      {companyContacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCompanyContact(index)}
                          className="h-11 w-11 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🛡️ Multi-Client Details Loop */}
          <div className="space-y-12">
              <div className="flex items-center justify-between border-b-2 border-primary/10 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10">
                    <UserPlus className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-foreground">Client Details</h2>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => appendClient({
                    fullName: "",
                    designation: "",
                    contacts: [{ type: "EMAIL", value: "", isPrimary: true }],
                    socials: [{ platform: "LINKEDIN", url: "" }],
                  })}
                  className="h-9 px-4 bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl border border-primary/20 transition-all active:scale-[0.98]"
                >
                  <Plus className="size-3.5 mr-2" />
                  Add Client
                </Button>
              </div>

              <div className="space-y-16">
                {clientFields.map((field, index) => (
                  <ClientSection
                    key={field.id}
                    index={index}
                    form={form}
                    removeClient={() => removeClient(index)}
                    isOnly={clientFields.length === 1}
                  />
                ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-10 border-t border-border/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="w-full sm:w-auto h-11 px-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/10 rounded-full transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isEdit ? "Save Profile" : "Create"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

/**
 * 🏭 ClientSection: Modular Stakeholder Unit
 * Manages nested field arrays for a single client within a multi-stakeholder form.
 */
function ClientSection({ index, form, removeClient, isOnly }: { index: number, form: any, removeClient: () => void, isOnly: boolean }) {
  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: `clients.${index}.contacts` as any,
  })

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control: form.control,
    name: `clients.${index}.socials` as any,
  })

  return (
    <div className="relative pt-8 border-primary/5 space-y-6 bg-primary/[0.01] -mx-4 px-4 py-8 rounded-3xl animate-in zoom-in-[0.98] duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/30 flex items-center gap-2 italic">
          Client Details #{index + 1}
        </h3>
        {!isOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeClient}
            className="h-7 text-[9px] font-bold uppercase tracking-tighter text-destructive hover:bg-destructive/10 rounded-lg px-2 flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="size-3" />
            Remove Client
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
        <FormField
          control={form.control}
          name={`clients.${index}.fullName` as any}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Client Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} className="h-12 text-sm font-medium tracking-tight border-primary/10 bg-background rounded-2xl focus:border-primary shadow-sm" />
              </FormControl>
              <FormMessage className="font-sans text-[10px] font-medium" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`clients.${index}.designation` as any}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[10px] font-semibold uppercase tracking-tight text-foreground">Designation *</FormLabel>
              <FormControl>
                <Input placeholder="Managing Director" {...field} className="h-12 text-sm font-medium tracking-tight border-primary/10 bg-background rounded-2xl focus:border-primary shadow-sm" />
              </FormControl>
              <FormMessage className="font-sans text-[10px] font-medium" />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-primary/5 pb-3 gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Mail className="size-3.5 text-primary/40" /> Contact Details
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => appendContact({ type: "EMAIL", value: "", isPrimary: contactFields.length === 0 })}
            className="h-8 px-4 text-[10px] font-bold tracking-tight bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground rounded-xl transition-all border border-primary/10"
          >
            + New Contact
          </Button>
        </div>

        <div className="space-y-4">
          {contactFields.map((fieldItem, contactIndex) => (
            <div key={fieldItem.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-2 items-end animate-in fade-in duration-300">
              <FormField
                control={form.control}
                name={`clients.${index}.contacts.${contactIndex}.type` as any}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 space-y-1.5">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-[11px] font-medium tracking-tight bg-background border-primary/10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTACT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-[11px] font-medium">
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
                name={`clients.${index}.contacts.${contactIndex}.value` as any}
                render={({ field }) => (
                  <FormItem className="sm:col-span-7 space-y-1.5">
                    <FormControl>
                      <Input
                        placeholder={form.watch(`clients.${index}.contacts.${contactIndex}.type`)?.includes("EMAIL") ? "address@domain.com" : "Numeric Contact Value"}
                        type={form.watch(`clients.${index}.contacts.${contactIndex}.type`)?.includes("EMAIL") ? "email" : "text"}
                        {...field}
                        onKeyPress={(e) => {
                          const type = form.getValues(`clients.${index}.contacts.${contactIndex}.type`);
                          if (["MOBILE", "LANDLINE", "WORK_PHONE", "WHATSAPP"].includes(type) && !/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="h-11 text-sm font-medium tracking-tight bg-background border-primary/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 h-11 pb-1">
                <FormField
                  control={form.control}
                  name={`clients.${index}.contacts.${contactIndex}.isPrimary` as any}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 group/check cursor-pointer h-full">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const contacts = form.getValues(`clients.${index}.contacts`);
                              form.setValue(`clients.${index}.contacts` as any, contacts.map((c: any, i: number) => ({ ...c, isPrimary: i === contactIndex })))
                            }
                          }}
                        />
                      </FormControl>
                      <span className="text-[11px] font-semibold tracking-tight text-foreground/70 group-hover/check:text-primary transition-colors">Primary</span>
                    </FormItem>
                  )}
                />
                {contactFields.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(contactIndex)} className="h-11 w-11 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-primary/5 pb-3 gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Globe className="size-3.5 text-primary/40" /> Social Profiles
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => appendSocial({ platform: "LINKEDIN", url: "" })}
            className="h-8 px-4 text-[10px] font-bold tracking-tight bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground rounded-xl transition-all border border-primary/10"
          >
            + New Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {socialFields.map((socialField, socialIndex) => (
            <div key={socialField.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-2 items-end animate-in fade-in duration-300">
              <FormField
                control={form.control}
                name={`clients.${index}.socials.${socialIndex}.platform` as any}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 space-y-1.5">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-[11px] font-medium tracking-tight bg-background border-primary/10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <SelectItem key={p} value={p} className="text-[11px] font-medium">
                            {p.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`clients.${index}.socials.${socialIndex}.url` as any}
                render={({ field }) => (
                  <FormItem className="sm:col-span-9 space-y-1.5">
                    <FormControl>
                      <Input
                        placeholder="linkedin.com/in/client"
                        type="url"
                        {...field}
                        className="h-11 text-sm font-medium tracking-tight bg-background border-primary/10 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-1 flex justify-end pb-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSocial(socialIndex)} className="h-11 w-11 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
