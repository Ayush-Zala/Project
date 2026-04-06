import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * NESTED ROLE ACTIONS
 * Path: /api/teams/[id]/roles/[...slug]
 * Handles:
 * - GET    /[roleId]             Detail
 * - DELETE /[roleId]             Purge
 * - PATCH  /[roleId]/toggle      Toggle Status
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; slug: string[] }> }
) {
  const { id: idStr, slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const roleId = parseInt(slug[0]);

  if (isNaN(teamId) || isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(userId, "team_roles:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");

  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = await (prisma as any).teamRole.findFirst({ where: { id: roleId, teamId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    return NextResponse.json(role);
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

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const roleId = parseInt(slug[0]);

  const canDelete = await hasPermission(userId, "team_roles:delete");
  const canReadAll = await hasPermission(userId, "teams:read_all");

  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const teamRole = await (prisma as any).teamRole.findFirst({ where: { id: roleId, teamId } });
    if (!teamRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    await (prisma as any).teamRole.delete({ where: { id: roleId } });
    await emitEvent("TEAM_ROLES_CHANGED", { action: "deleted", teamId, roleId });
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

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const roleId = parseInt(slug[0]);

  try {
    const role = await (prisma as any).teamRole.findFirst({ where: { id: roleId, teamId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const updated = await (prisma as any).teamRole.update({
      where: { id: roleId },
      data: { isActive: !role.isActive, updatedBy: userId, updatedAt: BigInt(Date.now()) }
    });
    await emitEvent("TEAM_ROLES_CHANGED", { action: "updated", teamId, roleId });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
