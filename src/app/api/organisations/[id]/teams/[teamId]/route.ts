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
  const allowed = await hasPermission(userId, "organisation:team:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = Number(orgIdStr);
  const teamId = Number(teamIdStr);

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

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
  const allowed = await hasPermission(userId, "organisation:team:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = Number(orgIdStr);
  const teamId = Number(teamIdStr);

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
