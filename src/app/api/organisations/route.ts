import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const organisationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(100).toLowerCase(),
  logo: z.string().url("Invalid logo URL").or(z.literal("")).optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * GET: List all organisations with pagination, search, and advanced filtering
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "organisation:read");
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
    // 1. Build general search (name or slug)
    const searchWhere = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {};

    // 2. Advanced filters
    const advancedWhere = getPrismaWhere(filters);

    // 3. Global Filter Context
    const where = {
        AND: [searchWhere, advancedWhere]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, organisations] = await Promise.all([
      (prisma as any).organisation.count({ where }),
      (prisma as any).organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { members: true, teams: true }
          }
        }
      }),
    ]);

    return NextResponse.json({
      organisations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ORGANISATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Provision a new Industrial Organisation
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:create");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = organisationSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const organisation = await (prisma as any).organisation.create({
      data: {
        name: result.data.name,
        slug: result.data.slug,
        logo: result.data.logo,
        description: result.data.description,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
      }
    });

    // Auto-assign creator as OWNER
    await (prisma as any).organisationMember.create({
        data: {
            userId: userId,
            organizationId: organisation.id,
            role: "owner",
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
        }
    });

    await emitEvent("ORGANISATIONS_CHANGED", { action: "created", organizationId: organisation.id });
    return NextResponse.json(organisation, { status: 201 });
  } catch (error) {
    console.error("[ORGANISATIONS_POST]", error);
    if ((error as any).code === 'P2002') {
        return NextResponse.json({ error: "Organisation with this slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
