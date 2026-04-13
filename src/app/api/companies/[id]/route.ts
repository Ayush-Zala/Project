import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
});

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Client contact value is required"),
  isPrimary: z.boolean().default(false),
});

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  url: z.string().url("Valid client social URL is required"),
});

const clientSchema = z.object({
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
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  contacts: z.array(companyContactSchema).min(1, "At least one company contact is required"),
  clients: z.array(clientSchema).min(1, "At least one client is required"),
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
    const existingCompany = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      select: { organisationId: true }
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

    // Atomic update using transaction
    const updatedCompany = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update basic info
      const company = await tx.company.update({
        where: { id: Number(companyId) },
        data: {
          ...companyData,
          updatedBy: userId,
          updatedAt: epochNow,
        }
      });

      // 2. Sync Company Contacts: Delete existing and re-create
      await tx.companyContact.deleteMany({
        where: { companyId: Number(companyId) }
      });

      await tx.companyContact.createMany({
        data: contacts.map(c => ({
          ...c,
          companyId: Number(companyId),
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
          createdAt: epochNow,
          updatedAt: epochNow,
        }))
      });

      // 3. Sync Clients: Sync by Replacement (Delete all and re-create for total fidelity)
      // This ensures removed clients are gone and order is preserved.
      await tx.companyClient.deleteMany({
        where: { companyId: Number(companyId) }
      });

      for (const client of clientsData) {
        const { contacts: clientContacts, socials: clientSocials, ...clientBase } = client;
        await tx.companyClient.create({
          data: {
            ...clientBase,
            companyId: Number(companyId),
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
            contacts: {
              create: clientContacts.map(cc => ({
                ...cc,
                isActive: true,
                createdBy: userId,
                updatedBy: userId,
                createdAt: epochNow,
                updatedAt: epochNow,
              }))
            },
            socials: {
              create: clientSocials.map(cs => ({
                ...cs,
                isActive: true,
                createdBy: userId,
                updatedBy: userId,
                createdAt: epochNow,
                updatedAt: epochNow,
              }))
            }
          }
        });
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
