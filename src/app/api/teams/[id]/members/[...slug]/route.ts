import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * NESTED MEMBER ACTIONS
 * Path: /api/teams/[id]/members/[...slug]
 * Handles:
 * - GET    /[memberId]             Detail
 * - DELETE /[memberId]             Remove
 * - PATCH  /[memberId]/toggle      Toggle Status
 * - POST   /[memberId]/assign-role Assign Role
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; slug: string[] }> }
) {
  const { id: idStr, slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const memberId = parseInt(slug[0]);

  if (isNaN(teamId) || isNaN(memberId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(actorId, "team_members:read");
  const canReadAll = await hasPermission(actorId, "teams:read_all");

  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await (prisma as any).teamMember.findFirst({
      where: { id: memberId, teamId },
      include: { user: { select: { id: true, name: true, email: true, image: true, isActive: true } }, roles: { include: { role: true } } }
    });

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; slug: string[] }> }
) {
  const { id: idStr, slug } = await params;
  const action = slug[1];
  if (action !== "assign-role") return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const memberId = parseInt(slug[0]);

  const canAssign = await hasPermission(actorId, "team_members:assign_role");
  const canReadAll = await hasPermission(actorId, "teams:read_all");

  if (!canAssign) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { roleId } = await req.json();
    if (!roleId || typeof roleId !== "number") return NextResponse.json({ error: "Invalid roleId" }, { status: 400 });

    const [member, role] = await Promise.all([
      (prisma as any).teamMember.findFirst({ where: { id: memberId, teamId } }),
      (prisma as any).teamRole.findFirst({ where: { id: roleId, teamId } })
    ]);

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const assignment = await (prisma as any).teamMemberRole.upsert({
      where: { teamMemberId_teamRoleId: { teamMemberId: memberId, teamRoleId: roleId } },
      update: { updatedBy: actorId, updatedAt: BigInt(Date.now()) },
      create: { teamMemberId: memberId, teamRoleId: roleId, createdBy: actorId, updatedBy: actorId, createdAt: BigInt(Date.now()), updatedAt: BigInt(Date.now()) }
    });

    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "updated", teamId, memberId });
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; slug: string[] }> }
) {
  const { id: idStr, slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const memberId = parseInt(slug[0]);

  const canDelete = await hasPermission(actorId, "team_members:delete");
  const canReadAll = await hasPermission(actorId, "teams:read_all");

  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: actorId }, { members: { some: { userId: actorId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await (prisma as any).teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    await (prisma as any).teamMember.delete({ where: { id: memberId } });
    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "deleted", teamId, memberId });
    return NextResponse.json({ message: "Success" });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; slug: string[] }> }
) {
  const { id: idStr, slug } = await params;
  const action = slug[1];
  if (action !== "toggle") return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const memberId = parseInt(slug[0]);

  try {
    const member = await (prisma as any).teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const updated = await (prisma as any).teamMember.update({
      where: { id: memberId },
      data: { isActive: !member.isActive, updatedBy: actorId, updatedAt: BigInt(Date.now()) }
    });
    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "updated", teamId, memberId });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
