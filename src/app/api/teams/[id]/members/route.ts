import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const teamMemberSchema = z.object({
  userId: z.number(),
});

/**
 * GET: List all members for a team
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(actorId, "team_members:read");
  const canReadAll = await hasPermission(actorId, "teams:read_all");
  
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Isolation Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await (prisma as any).teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, isActive: true } },
        roles: { include: { role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(members);
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
