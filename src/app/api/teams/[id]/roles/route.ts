import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { slugify } from "@/lib/utils";

import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const teamRoleSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50),
  description: z.string().max(255).optional().nullable(),
});

/**
 * GET: List all roles for a team with pagination and search
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(userId, "team_roles:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
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
    // Isolation Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Build general search where
    const searchWhere = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {};

    // 2. Build advanced filters where
    const advancedWhere = getPrismaWhere(filters);

    // 3. Combine with AND
    const where = {
      AND: [{ teamId }, searchWhere, advancedWhere]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, roles] = await Promise.all([
      (prisma as any).teamRole.count({ where }),
      (prisma as any).teamRole.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    return NextResponse.json({
      roles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[TEAM_ROLES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new role for a team
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  
  const canCreate = await hasPermission(userId, "team_roles:create");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = teamRoleSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const slug = slugify(result.data.name);
    const existing = await (prisma as any).teamRole.findUnique({ where: { teamId_slug: { teamId, slug } } });
    if (existing) return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });

    const role = await (prisma as any).teamRole.create({
      data: { ...result.data, slug, teamId, createdBy: userId, updatedBy: userId, createdAt: BigInt(Date.now()), updatedAt: BigInt(Date.now()) }
    });

    await emitEvent("TEAM_ROLES_CHANGED", { action: "created", teamId, roleId: role.id });
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("[TEAM_ROLES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
