import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";
import { validateRoleAssignment } from "@/lib/security-rules";

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "member"]),
});

/**
 * GET: List all members of an Organisation
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = parseInt(resolvedParams.id);

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "organisation_member:read", orgId);
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
            { organizationId: orgId },
            searchWhere,
            advancedWhere
        ]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, members] = await Promise.all([
      (prisma as any).organisationMember.count({ where }),
      (prisma as any).organisationMember.findMany({
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
    console.error("[MEMBERS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Invite or Add a member to an Organisation
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = parseInt(resolvedParams.id);

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation_member:create", orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = memberSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    // 🛡️ Security Protocol: Only 'member' role can be assigned during addition
    try {
        validateRoleAssignment(result.data.role);
    } catch (ve: any) {
        return NextResponse.json({ error: ve.message }, { status: 403 });
    }

    const targetUser = await (prisma as any).user.findUnique({
        where: { email: result.data.email }
    });

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 🛡️ Security Protocol: Check for existing membership to prevent duplicates
    const existingMember = await (prisma as any).organisationMember.findFirst({
        where: {
            userId: targetUser.id,
            organizationId: orgId
        }
    });

    if (existingMember) {
        return NextResponse.json({ error: "User is already a member of this organisation" }, { status: 400 });
    }

    const member = await (prisma as any).organisationMember.create({
      data: {
        user: { connect: { id: targetUser.id } },
        organisation: { connect: { id: orgId } },
        role: result.data.role,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      }
    });

    await emitEvent("ORGANISATION_MEMBERS_CHANGED", { action: "added", organisationId: String(orgId), memberId: String(member.id) });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[MEMBERS_POST]", error);
    if ((error as any).code === 'P2002') {
        return NextResponse.json({ error: "User is already a member of this organisation" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
