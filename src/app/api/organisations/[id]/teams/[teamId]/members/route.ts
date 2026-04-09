import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const assignSchema = z.object({
  userIds: z.array(z.number()),
});

/**
 * GET: List all members of a specific Organisation Team
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string, teamId: string }> }) {
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = Number(resolvedParams.id);
  const teamId = Number(resolvedParams.teamId);

  const userId = Number(session.user.id);

  // 🛡️ Team Status Guard: Block non-creators/non-admins from inactive teams
  const team = await (prisma as any).organisationTeam.findUnique({
    where: { id: teamId },
    select: { isActive: true, createdBy: true }
  });

  if (team && !team.isActive) {
    const isCreator = team.createdBy === userId;
    const isSuperAdmin = session.user.role === "super-admin" || 
      (await (prisma as any).userRole.findFirst({
        where: { userId, role: { slug: "super-admin" }, isActive: true }
      }));

    if (!isCreator && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Team is inactive" }, { status: 403 });
    }
  }

  const canRead = await hasPermission(userId, "organisation_team_member:read", orgId);
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
          { user: { name: { contains: search, mode: "insensitive" as const } } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }
      : {};

    const advancedWhere = getPrismaWhere(filters);

    const where = {
        AND: [
            { teamId: teamId },
            searchWhere,
            advancedWhere
        ]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, members] = await Promise.all([
      (prisma as any).organisationTeamMember.count({ where }),
      (prisma as any).organisationTeamMember.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              isActive: true,
            }
          }
        }
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
 * POST: Bulk Assign members to a Team
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string, teamId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = Number(resolvedParams.id);
  const teamId = Number(resolvedParams.teamId);

  const userId = Number(session.user.id);

  // 🛡️ Team Status Guard: Block non-creators/non-admins from inactive teams
  const team = await (prisma as any).organisationTeam.findUnique({
    where: { id: teamId },
    select: { isActive: true, createdBy: true }
  });

  if (team && !team.isActive) {
    const isCreator = team.createdBy === userId;
    const isSuperAdmin = session.user.role === "super-admin" || 
      (await (prisma as any).userRole.findFirst({
        where: { userId, role: { slug: "super-admin" }, isActive: true }
      }));

    if (!isCreator && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Team is inactive" }, { status: 403 });
    }
  }
  const allowed = await hasPermission(userId, "organisation_team_member:assign", orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = assignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { userIds } = result.data;

    // 🛡️ Security Protocol: All users must be members of the organization
    const orgMembers = await (prisma as any).organisationMember.findMany({
        where: {
            organizationId: orgId,
            userId: { in: userIds }
        },
        select: { userId: true }
    });

    const validUserIds = orgMembers.map((om: any) => om.userId);
    if (validUserIds.length !== userIds.length) {
        return NextResponse.json({ error: "Some users are not members of this organization" }, { status: 400 });
    }

    // Assign in a loop (or transaction if preferred)
    // We'll use createMany if possible or a simple loop for cleaner audit trail via extensions
    const assignments = [];
    for (const uId of validUserIds) {
        // Skip if already assigned
        const exists = await (prisma as any).organisationTeamMember.findFirst({
            where: { teamId, userId: uId }
        });
        
        if (!exists) {
            assignments.push(
                (prisma as any).organisationTeamMember.create({
                    data: {
                        teamId,
                        userId: uId,
                        isActive: true,
                        createdBy: userId,
                        updatedBy: userId
                    }
                })
            );
        }
    }

    if (assignments.length > 0) {
        await Promise.all(assignments);
        await emitEvent("ORGANISATION_TEAM_MEMBERS_CHANGED", { action: "assigned", organisationId: String(orgId), teamId: String(teamId) });
    }

    return NextResponse.json({ success: true, count: assignments.length });
  } catch (error) {
    console.error("[TEAM_MEMBERS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
