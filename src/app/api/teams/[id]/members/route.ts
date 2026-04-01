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

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "team_members:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Isolation Check
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

    const members = await (prisma as any).teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, isActive: true }
        },
        roles: {
          include: { role: true }
        }
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
 * POST: Add a member to a team
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canCreate = await hasPermission(userId, "team_members:create");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Isolation Check
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
    const result = teamMemberSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { userId: targetUserId } = result.data;

    // Check if team exists
    const teamExists = await (prisma as any).team.findUnique({ where: { id } });
    if (!teamExists) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Check if user exists
    const userExists = await (prisma as any).user.findUnique({ where: { id: targetUserId } });
    if (!userExists) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if already a member
    const existing = await (prisma as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: targetUserId } }
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 });
      } else {
        // Reactivate
        const updated = await (prisma as any).teamMember.update({
          where: { id: existing.id },
          data: { isActive: true, updatedBy: userId, updatedAt: BigInt(Date.now()) }
        });
        await emitEvent("TEAM_MEMBERS_CHANGED", { action: "updated", teamId: id, memberId: updated.id });
        return NextResponse.json(updated);
      }
    }

    const member = await (prisma as any).teamMember.create({
      data: {
        teamId: id,
        userId: targetUserId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "created", teamId: id, userId: targetUserId });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[TEAM_MEMBERS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
