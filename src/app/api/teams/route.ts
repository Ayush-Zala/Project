import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const teamSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50),
  description: z.string().max(255).optional().nullable(),
});

/**
 * GET: List all teams with pagination and search
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "teams:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ]
        } : {},
        !canReadAll ? {
          OR: [
            { createdBy: userId },
            { members: { some: { userId, isActive: true } } }
          ]
        } : {}
      ]
    };

    const [total, teams] = await Promise.all([
      (prisma as any).team.count({ where }),
      (prisma as any).team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, roles: true }
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
    console.error("[TEAMS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new team
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "teams:create");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = teamSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const team = await (prisma as any).team.create({
      data: {
        ...result.data,
        createdBy: userId,
        updatedBy: userId,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAMS_CHANGED", { action: "created", teamId: team.id });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("[TEAMS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
