import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission, checkIsOrgOwner } from "@/lib/rbac";

const companyContactSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.length > 0), {
  message: "Specific contact type is required for 'OTHER'",
  path: ["otherType"]
});

const clientContactSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Client contact value is required"),
  isPrimary: z.boolean().default(false),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.length > 0), {
  message: "Specific contact type is required for 'OTHER'",
  path: ["otherType"]
});

const clientSocialSchema = z.object({
  id: z.number().optional(),
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  otherPlatform: z.string().optional(),
  url: z.string().url("Valid client social URL is required"),
}).refine(data => data.platform !== "OTHER" || (data.otherPlatform && data.otherPlatform.length > 0), {
  message: "Specific platform name is required for 'OTHER'",
  path: ["otherPlatform"]
});

const clientSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(2, "Client full name is required"),
  designation: z.string().min(1, "Client designation is required"),
  contacts: z.array(clientContactSchema).min(1, "At least one client contact is required"),
  socials: z.array(clientSocialSchema).min(1, "At least one social profile is required"),
});


const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  website: z.string().url("Valid website URL is required"),
  industryId: z.number().positive("Industry is required"),
  source: z.enum(["REFERRAL", "COLD_CALL", "COLD_EMAIL", "LINKEDIN", "WEBSITE", "CONFERENCE", "PAID_AD", "CONTENT_MARKETING", "PARTNER", "OTHER"]).optional(),
  otherSource: z.string().optional(),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  contacts: z.array(companyContactSchema).min(1, "At least one company contact is required"),
  clients: z.array(clientSchema).min(1, "At least one client is required"),
}).refine(data => data.source !== "OTHER" || (data.otherSource && data.otherSource.length > 0), {
  message: "Specific source description is required for 'OTHER'",
  path: ["otherSource"]
});

/**
 * GET: Fetch Company Detail
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      include: {
        industry: true,
        contacts: {
          where: { isActive: true }
        },
        clients: {
          where: { isActive: true },
          include: {
            contacts: { where: { isActive: true } },
            socials: { where: { isActive: true } },
          }
        }
      }
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const canRead = await hasPermission(userId, "company:read", company.organisationId);
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const canReadAll = await hasPermission(userId, "company:read_all", company.organisationId);
    const isOwner = await checkIsOrgOwner(userId, company.organisationId);
    const isAuthor = company.createdBy === userId;

    if (!canReadAll && !isOwner && !isAuthor) {
      return NextResponse.json({ error: "Access Denied: You do not have permission to view this record" }, { status: 403 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("[COMPANY_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update Company
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    // 1. Fetch Full State for Deep Diffing
    const existingCompany = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      include: {
        contacts: true,
        clients: {
          include: {
            contacts: true,
            socials: true
          }
        }
      }
    });

    if (!existingCompany) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company:update", existingCompany.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const result = companySchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" | ");
      return NextResponse.json({ error: `Validation Failed: ${errors}` }, { status: 400 });
    }

    const { contacts, clients: clientsData, ...companyData } = result.data;
    const epochNow = BigInt(Date.now());

    // 🛡️ Deep Comparison Helper
    const isSame = (oldObj: any, newObj: any, fields: string[]) => {
      if (!oldObj) return false;
      return fields.every(f => oldObj[f] === newObj[f]);
    };

    // Atomic update using transaction
    const updatedCompany = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update basic info ONLY if changed
      if (!isSame(existingCompany, companyData, ["name", "website", "industryId", "source", "otherSource", "addressLine1", "addressLine2", "city", "state", "country", "postalCode"])) {
        await tx.company.update({
          where: { id: Number(companyId) },
          data: {
            ...companyData,
            updatedBy: userId,
            updatedAt: epochNow,
          }
        });
      }

      // 2. Smart Sync Company Contacts
      const incomingContactIds = contacts.map(c => c.id).filter(Boolean) as number[];
      const existingContactIds = existingCompany.contacts.map((c: any) => c.id);
      
      // Targeted delete ONLY if needed
      const contactsToDelete = existingContactIds.filter((id: number) => !incomingContactIds.includes(id));
      if (contactsToDelete.length > 0) {
        await tx.companyContact.deleteMany({
          where: { id: { in: contactsToDelete } }
        });
      }

      // Upsert existing/new contacts
      for (const contact of contacts) {
        const { id, ...cData } = contact;
        const existing = existingCompany.contacts.find((c: any) => c.id === id);
        
        // Skip if identical
        if (existing && isSame(existing, cData, ["type", "otherType", "value", "isPrimary"])) continue;

        await tx.companyContact.upsert({
          where: { id: id || -1 },
          update: { ...cData, updatedBy: userId, updatedAt: epochNow },
          create: {
            ...cData,
            companyId: Number(companyId),
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }
        });
      }

      // 3. Smart Sync Clients
      const incomingClientIds = clientsData.map(c => c.id).filter(Boolean) as number[];
      const existingClientIds = existingCompany.clients.map((c: any) => c.id);

      // Targeted delete for removed clients
      const clientsToDelete = existingClientIds.filter((id: number) => !incomingClientIds.includes(id));
      if (clientsToDelete.length > 0) {
        await tx.companyClient.deleteMany({
          where: { id: { in: clientsToDelete } }
        });
      }

      for (const client of clientsData) {
        const { id, contacts: clientContacts, socials: clientSocials, ...clientBase } = client;
        const existingClientRecord = existingCompany.clients.find((c: any) => c.id === id);
        
        // Update Client ONLY if base details changed
        let clientId = id;
        if (!existingClientRecord || !isSame(existingClientRecord, clientBase, ["fullName", "designation"])) {
          const upsertedClient = await tx.companyClient.upsert({
            where: { id: id || -1 },
            update: { ...clientBase, updatedBy: userId, updatedAt: epochNow },
            create: {
              ...clientBase,
              companyId: Number(companyId),
              isActive: true,
              createdBy: userId,
              updatedBy: userId,
              createdAt: epochNow,
              updatedAt: epochNow,
            }
          });
          clientId = upsertedClient.id;
        }

        // --- DEEP SYNC: Client Contacts ---
        const incomingCCIds = clientContacts.map(cc => cc.id).filter(Boolean) as number[];
        const existingCCIds = existingClientRecord?.contacts.map((cc: any) => cc.id) || [];
        
        const ccToDelete = existingCCIds.filter((ccid: number) => !incomingCCIds.includes(ccid));
        if (ccToDelete.length > 0) {
          await tx.companyClientContact.deleteMany({
            where: { id: { in: ccToDelete } }
          });
        }

        for (const cc of clientContacts) {
          const { id: ccId, ...ccData } = cc;
          const existingCC = existingClientRecord?.contacts.find((ecc: any) => ecc.id === ccId);
          if (existingCC && isSame(existingCC, ccData, ["type", "otherType", "value", "isPrimary"])) continue;

          await tx.companyClientContact.upsert({
            where: { id: ccId || -1 },
            update: { ...ccData, updatedBy: userId, updatedAt: epochNow },
            create: {
              ...ccData,
              clientId: clientId!,
              isActive: true,
              createdBy: userId,
              updatedBy: userId,
              createdAt: epochNow,
              updatedAt: epochNow,
            }
          });
        }

        // --- DEEP SYNC: Client Socials ---
        const incomingCSIds = clientSocials.map(cs => cs.id).filter(Boolean) as number[];
        const existingCSIds = existingClientRecord?.socials.map((cs: any) => cs.id) || [];

        const csToDelete = existingCSIds.filter((csid: number) => !incomingCSIds.includes(csid));
        if (csToDelete.length > 0) {
          await tx.companyClientSocialProfile.deleteMany({
            where: { id: { in: csToDelete } }
          });
        }

        for (const cs of clientSocials) {
          const { id: csId, ...csData } = cs;
          const existingCS = existingClientRecord?.socials.find((ecs: any) => ecs.id === csId);
          if (existingCS && isSame(existingCS, csData, ["platform", "otherPlatform", "url"])) continue;

          await tx.companyClientSocialProfile.upsert({
            where: { id: csId || -1 },
            update: { ...csData, updatedBy: userId, updatedAt: epochNow },
            create: {
              ...csData,
              clientId: clientId!,
              isActive: true,
              createdBy: userId,
              updatedBy: userId,
              createdAt: epochNow,
              updatedAt: epochNow,
            }
          });
        }
      }

      return await tx.company.findUnique({
        where: { id: Number(companyId) },
        include: { 
          contacts: true,
          clients: {
            include: {
              contacts: true,
              socials: true
            }
          }
        }
      });
    });

    await emitEvent("COMPANIES_CHANGED", { action: "updated", organisationId: existingCompany.organisationId, companyId });
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("[COMPANY_PUT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Hard delete Company
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      select: { organisationId: true }
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company:delete", company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await (prisma as any).company.delete({
      where: { id: Number(companyId) }
    });

    await emitEvent("COMPANIES_CHANGED", { action: "deleted", organisationId: company.organisationId, companyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COMPANY_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
