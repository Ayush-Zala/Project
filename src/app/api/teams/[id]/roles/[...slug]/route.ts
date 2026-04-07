import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import * as z from "zod";
import { slugify } from "@/lib/utils";

const teamRoleUpdateSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50).optional(),
  description: z.string().max(255).optional().nullable(),
});

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
  const action = slug[1]; // action like 'toggle'
  
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  const roleId = parseInt(slug[0]);

  if (isNaN(teamId) || isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canUpdate = await hasPermission(userId, "team_roles:update");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  if (!canUpdate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existingTeam = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existingTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = await (prisma as any).teamRole.findFirst({ where: { id: roleId, teamId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // 1. Handle TOGGLE Action
    if (action === "toggle") {
      const updated = await (prisma as any).teamRole.update({
        where: { id: roleId },
        data: { isActive: !role.isActive, updatedBy: userId, updatedAt: BigInt(Date.now()) }
      });
      await emitEvent("TEAM_ROLES_CHANGED", { action: "updated", teamId, roleId });
      return NextResponse.json(updated);
    }

    // 2. Handle General UPDATE Action (Direct PATCH /[roleId])
    if (!action) {
      const body = await req.json();
      const result = teamRoleUpdateSchema.safeParse(body);
      if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

      const updateData: any = {
        ...result.data,
        updatedBy: userId,
        updatedAt: BigInt(Date.now())
      };

      // Handle name change and slug regeneration
      if (result.data.name && result.data.name !== role.name) {
        const newSlug = slugify(result.data.name);
        const duplicate = await (prisma as any).teamRole.findUnique({
          where: { teamId_slug: { teamId, slug: newSlug } }
        });
        if (duplicate && duplicate.id !== roleId) {
          return NextResponse.json({ error: "A role with this name already exists in this team" }, { status: 400 });
        }
        updateData.slug = newSlug;
      }

      const updated = await (prisma as any).teamRole.update({
        where: { id: roleId },
        data: updateData
      });

      await emitEvent("TEAM_ROLES_CHANGED", { action: "updated", teamId, roleId });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
  } catch (error) {
    console.error("[TEAM_ROLE_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
