"use client"

import * as React from "react"
import {
  Building,
  Globe,
  Mail,
  MapPin,
  ExternalLink,
  Briefcase,
  User,
  Link as LinkIcon,
  Phone,
  MessageSquare
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface CompanyViewProps {
  data: any
}

export function CompanyView({ data }: CompanyViewProps) {
  if (!data) return null

  return (
    <div className="space-y-8 pb-10">
      {/* 🏢 Company Header Section */}
      <section className="bg-background border border-border/60 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/5 rounded-xl border border-primary/10 text-primary">
                <Building className="size-5" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-primary/60">Company Profile</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground italic uppercase">
                {data.name}
              </h1>
              {data.website && (
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  <Globe className="size-4" />
                  {data.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="px-5 py-2 bg-muted/40 border border-border/50 rounded-xl min-w-[120px]">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Industry</p>
              <p className="text-sm font-bold text-foreground truncate">{data.industry?.name || "None"}</p>
            </div>
            <div className="px-5 py-2 bg-muted/40 border border-border/50 rounded-xl min-w-[120px]">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Source</p>
              <p className="text-sm font-bold text-foreground capitalize truncate max-w-[150px]" title={data.source === "OTHER" ? data.otherSource : data.source}>
                {data.source === "OTHER" && data.otherSource 
                  ? data.otherSource 
                  : data.source?.toLowerCase().replace("_", " ") || "Other"}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-border/40" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {/* Address Details */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
              <MapPin className="size-4 text-primary/40" /> Address
            </h3>
            <div className="space-y-1 text-sm font-medium text-foreground/70 leading-relaxed">
              <p>{data.addressLine1}</p>
              {data.addressLine2 && <p>{data.addressLine2}</p>}
              <p>{data.city}, {data.state} {data.postalCode}</p>
              <p className="font-bold text-foreground uppercase tracking-tight">{data.country}</p>
            </div>
          </div>

          {/* Company Contacts */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
              <Phone className="size-4 text-primary/40" /> Contacts
            </h3>
            <div className="space-y-4">
              {[...(data.contacts || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((contact: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    "size-9 rounded-xl flex items-center justify-center border shrink-0",
                    contact.isPrimary ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted/50 border-border/50 text-muted-foreground"
                  )}>
                    {contact.type.includes("EMAIL") ? <Mail className="size-4" /> : <Phone className="size-4" />}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm font-bold truncate text-foreground leading-none">{contact.value}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter mt-1 opacity-60 line-clamp-1">
                      {contact.type === "OTHER" && contact.otherType 
                        ? contact.otherType 
                        : contact.type.replace("_", " ")} {contact.isPrimary && "(PRIMARY)"}
                    </p>
                  </div>
                </div>
              ))}
              {(!data.contacts || data.contacts.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No contact details</p>
              )}
            </div>
          </div>

          {/* Other Details */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
              <Briefcase className="size-4 text-primary/40" /> Other Details
            </h3>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5">Status</p>
                <div className="flex items-center h-6">
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold px-2 h-5 flex items-center",
                    data.isActive ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"
                  )}>
                    {data.isActive ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5">Date Added</p>
                <div className="flex items-center h-6">
                  <p className="text-sm font-bold text-foreground leading-none">{format(new Date(Number(data.createdAt)), "dd-MM-yyyy")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 👥 Clients List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-primary/10 pb-4 mx-2">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground uppercase italic">Clients List</h2>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-bold">
            {data.clients?.length || 0} TOTAL
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.clients?.map((client: any, i: number) => (
            <ClientDetailCard key={i} client={client} />
          ))}
          {(!data.clients || data.clients.length === 0) && (
            <div className="lg:col-span-2 py-16 text-center bg-muted/5 border border-dashed border-border/80 rounded-3xl">
              <User className="size-7 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground tracking-wide">No clients found for this company</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientDetailCard({ client }: { client: any }) {
  return (
    <div className="group bg-background border border-border/60 rounded-3xl p-6 transition-all hover:border-primary/20 shadow-sm">
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-tight text-foreground italic leading-tight group-hover:text-primary transition-colors">
            {client.fullName}
          </h3>
          <p className="text-sm font-medium text-muted-foreground italic mt-1 leading-tight">{client.designation}</p>
        </div>
        <div className="size-11 bg-muted/30 rounded-2xl flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
          <User className="size-5.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Client Contacts */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
            Email & Phone
          </h4>
          <div className="space-y-4 pt-1">
            {[...(client.contacts || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((contact: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-8 bg-muted/50 rounded-xl flex items-center justify-center text-muted-foreground border border-border/60 shrink-0">
                  {contact.type.includes("EMAIL") ? <Mail className="size-3.5" /> : (contact.type === "WHATSAPP" ? <MessageSquare className="size-3.5" /> : <Phone className="size-3.5" />)}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate leading-none">{contact.value}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter mt-1 opacity-70 line-clamp-1">
                    {contact.type === "OTHER" && contact.otherType 
                      ? contact.otherType 
                      : contact.type.replace("_", " ")} {contact.isPrimary && "(PRIMARY)"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Socials */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
            Social Links
          </h4>
          <div className="flex flex-wrap gap-2 pt-1">
            {client.socials?.map((social: any, i: number) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 hover:bg-primary/5 border border-border/60 hover:border-primary/20 rounded-xl transition-all"
              >
                {getSocialIcon(social.platform)}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight line-clamp-1">
                  {social.platform === "OTHER" && social.otherPlatform 
                    ? social.otherPlatform 
                    : social.platform.toLowerCase().replace("_", " ")}
                </span>
                <ExternalLink className="size-2.5 opacity-40" />
              </a>
            ))}
            {(!client.socials || client.socials.length === 0) && (
              <p className="text-[10px] text-muted-foreground italic mt-2">No links saved</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSocialIcon(platform: string) {
  const props = { className: "size-3 text-primary/60" }
  switch (platform) {
    case "WEBSITE":
    case "BLOG":
      return <Globe {...props} />
    default:
      return <LinkIcon {...props} />
  }
}
