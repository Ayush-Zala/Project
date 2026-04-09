import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import * as z from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH: Update or toggle an Organisation Team
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const { id: orgIdStr, teamId: teamIdStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canUpdate = await hasPermission(userId, "organisation_team:update", Number(orgIdStr));
  const canToggle = await hasPermission(userId, "organisation_team:toggle", Number(orgIdStr));
  
  if (!canUpdate && !canToggle) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = Number(orgIdStr);
  const teamId = Number(teamIdStr);

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

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    // 🛡️ Security Guard: Prevent name updates if the user only has 'toggle' capability
    if (!canUpdate && canToggle && result.data.name !== undefined) {
      return NextResponse.json({ error: "Forbidden: You only have permission to toggle status, not update names" }, { status: 403 });
    }

    const team = await (prisma as any).organisationTeam.update({
      where: { 
        id: teamId,
        organizationId: orgId
      },
      data: {
        ...result.data,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("ORGANISATION_TEAMS_CHANGED", { 
      action: "updated", 
      organisationId: orgIdStr, 
      teamId: teamIdStr 
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("[ORGANISATION_TEAM_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove an Organisation Team
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const { id: orgIdStr, teamId: teamIdStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation_team:delete", Number(orgIdStr));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = Number(orgIdStr);
  const teamId = Number(teamIdStr);

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

  try {
    await (prisma as any).organisationTeam.delete({
      where: { 
        id: teamId,
        organizationId: orgId
      }
    });

    await emitEvent("ORGANISATION_TEAMS_CHANGED", { 
      action: "deleted", 
      organisationId: orgIdStr, 
      teamId: teamIdStr 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORGANISATION_TEAM_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
