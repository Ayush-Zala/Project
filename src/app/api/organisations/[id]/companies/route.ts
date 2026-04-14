import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission, checkIsOrgOwner } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Company contact value is required"),
  isPrimary: z.boolean().default(false),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.length > 0), {
  message: "Specific contact type is required for 'OTHER'",
  path: ["otherType"]
});

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Client contact value is required"),
  isPrimary: z.boolean().default(false),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.length > 0), {
  message: "Specific contact type is required for 'OTHER'",
  path: ["otherType"]
});

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  otherPlatform: z.string().optional(),
  url: z.string().url("Valid client social URL is required"),
}).refine(data => data.platform !== "OTHER" || (data.otherPlatform && data.otherPlatform.length > 0), {
  message: "Specific platform name is required for 'OTHER'",
  path: ["otherPlatform"]
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
  otherSource: z.string().optional(),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  contacts: z.array(companyContactSchema).min(1, "At least one company contact is required"),
  clients: z.array(clientSchema).min(1, "At least one stakeholder is required"),
}).refine(data => data.source !== "OTHER" || (data.otherSource && data.otherSource.length > 0), {
  message: "Specific source description is required for 'OTHER'",
  path: ["otherSource"]
});

/**
 * GET: List all Companies in an Organisation
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organisationId } = await params;
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "company:read", Number(organisationId));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("per_page") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "";
  const filtersRaw = searchParams.get("filters") || "[]";
  
  let filters: ExtendedColumnFilter[] = [];
  try {
    filters = JSON.parse(filtersRaw);
  } catch (e) {
    console.warn("Invalid filters ignored");
  }

  const skip = (page - 1) * limit;

  try {
    const searchWhere = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { website: { contains: search, mode: "insensitive" as const } },
        ]
      }
      : {};

    const advancedWhere = getPrismaWhere(filters);
    
    const canReadAll = await hasPermission(userId, "company:read_all", Number(organisationId));
    const isOwner = await checkIsOrgOwner(userId, Number(organisationId));
    
    const where = {
      AND: [
        { organisationId: Number(organisationId) },
        searchWhere,
        advancedWhere,
        ...(!(canReadAll || isOwner) ? [{ 
          OR: [
            { createdBy: userId },
            { assignedMembers: { some: { member: { userId: userId, isActive: true }, isActive: true } } }
          ]
        }] : []),

      ]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, companies] = await Promise.all([
      (prisma as any).company.count({ where }),
      (prisma as any).company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          industry: true,
          contacts: {
            where: { isActive: true }
          },
          _count: {
            select: { clients: true }
          }
        }
      }),
    ]);

    return NextResponse.json({
      companies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[COMPANIES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a Company with Compulsory Client
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organisationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "company:create", Number(organisationId));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = companySchema.safeParse(body);
    if (!result.success) {
        const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" | ");
        return NextResponse.json({ error: `Validation Failed: ${errors}` }, { status: 400 });
    }

    const { contacts, clients: clientsData, ...companyData } = result.data;

    const epochNow = BigInt(Date.now());

    // 🚀 Execution: Transactional Nested Creation
    const company = await (prisma as any).company.create({
      data: {
        ...companyData,
        organisationId: Number(organisationId),
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
        createdAt: epochNow,
        updatedAt: epochNow,
        contacts: {
          create: contacts.map(c => ({
            ...c,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }))
        },
        clients: {
          create: clientsData.map((client) => {
            const { contacts: clientContacts, socials: clientSocials, ...clientBase } = client;
            return {
              ...clientBase,
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
            };
          })
        }
      },
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

    // 📣 Notify both modules
    await emitEvent("COMPANIES_CHANGED", { action: "created", organisationId, companyId: String(company.id) });
    await emitEvent("CLIENTS_CHANGED", { action: "created", organisationId, companyId: String(company.id), clientId: String(company.clients[0].id) });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("[COMPANIES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
