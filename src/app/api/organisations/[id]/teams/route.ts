import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const teamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

/**
 * GET: List all teams in an Organisation
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    const searchWhere = search
      ? {
        name: { contains: search, mode: "insensitive" as const }
      }
      : {};

    const advancedWhere = getPrismaWhere(filters);

    const where = {
        AND: [
            { organizationId: Number(id) },
            searchWhere,
            advancedWhere
        ]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, teams] = await Promise.all([
      (prisma as any).organisationTeam.count({ where }),
      (prisma as any).organisationTeam.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { members: true }
          }
        }
      }),
    ]);

    return NextResponse.json({
      teams,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ORGANISATION_TEAMS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a team within an Organisation
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:team:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = teamSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const team = await (prisma as any).organisationTeam.create({
      data: {
        name: result.data.name,
        organizationId: Number(id),
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("ORGANISATION_TEAMS_CHANGED", { action: "created", organisationId: id, teamId: String(team.id) });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("[ORGANISATION_TEAMS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
