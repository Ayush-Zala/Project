import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const companyContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
});

const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  website: z.string().url().optional().or(z.literal("")),
  industryId: z.number().positive("Industry is required"),
  source: z.enum(["REFERRAL", "COLD_CALL", "COLD_EMAIL", "LINKEDIN", "WEBSITE", "CONFERENCE", "PAID_AD", "CONTENT_MARKETING", "PARTNER", "OTHER"]),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contacts: z.array(companyContactSchema).min(1, "At least one contact is required"),
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
    
    const where = {
      AND: [
        { organisationId: Number(organisationId) },
        searchWhere,
        advancedWhere,
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
 * POST: Create a Company
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
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { contacts, ...companyData } = result.data;

    const epochNow = BigInt(Date.now());

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
        }
      },
      include: {
        contacts: true
      }
    });

    await emitEvent("COMPANIES_CHANGED", { action: "created", organisationId, companyId: String(company.id) });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("[COMPANIES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
