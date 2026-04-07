import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const teamUpdateSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50).optional(),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET: Fetch a single team by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "teams:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const where: any = { id };
    if (!canReadAll) {
      where.OR = [
        { createdBy: userId },
        { members: { some: { userId, isActive: true } } }
      ];
    }

    const team = await (prisma as any).team.findFirst({
      where,
      include: {
        _count: {
          select: { members: true, roles: true }
        }
      }
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    return NextResponse.json(team);
  } catch (error) {
    console.error("[TEAM_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update a team
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canUpdate = await hasPermission(userId, "teams:update");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canUpdate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Visibility Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { members: { some: { userId, isActive: true } } }
          ]
        }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = teamUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const team = await (prisma as any).team.update({
      where: { id },
      data: {
        ...result.data,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAMS_CHANGED", { action: "updated", teamId: team.id });
    return NextResponse.json(team);
  } catch (error) {
    console.error("[TEAM_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Delete a team
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canDelete = await hasPermission(userId, "teams:delete");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Visibility/Ownership Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { members: { some: { userId, isActive: true } } }
          ]
        }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await (prisma as any).team.delete({ where: { id } });
    await emitEvent("TEAMS_CHANGED", { action: "deleted", teamId: id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TEAM_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
