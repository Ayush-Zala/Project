import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const teamMemberSchema = z.object({
  userId: z.number(),
});

/**
 * GET: List all members for a team with pagination and search
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(actorId, "team_members:read");
  const canReadAll = await hasPermission(actorId, "teams:read_all");
  
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
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Build general search where
    const searchWhere = search
      ? {
        OR: [
          { user: { name: { contains: search, mode: "insensitive" as const } } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
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

    const [total, members] = await Promise.all([
      (prisma as any).teamMember.count({ where }),
      (prisma as any).teamMember.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, name: true, email: true, image: true, isActive: true } },
          roles: { include: { role: true } }
        },
      }),
    ]);

    return NextResponse.json({
      members,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[TEAM_MEMBERS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Add a new member to a team
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  
  const canCreate = await hasPermission(actorId, "team_members:create");
  const canReadAll = await hasPermission(actorId, "teams:read_all");
  
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = teamMemberSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { userId: targetUserId } = result.data;

    // Check if already a member (even inactive)
    const existing = await (prisma as any).teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } }
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      } else {
        // Reactivate
        const updated = await (prisma as any).teamMember.update({
          where: { id: existing.id },
          data: { isActive: true, updatedBy: actorId, updatedAt: BigInt(Date.now()) }
        });
        await emitEvent("TEAM_MEMBERS_CHANGED", { action: "updated", teamId, memberId: updated.id });
        return NextResponse.json(updated);
      }
    }

    const member = await (prisma as any).teamMember.create({
      data: { teamId, userId: targetUserId, createdBy: actorId, updatedBy: actorId, createdAt: BigInt(Date.now()), updatedAt: BigInt(Date.now()) }
    });

    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "created", teamId, userId: targetUserId });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[TEAM_MEMBERS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
