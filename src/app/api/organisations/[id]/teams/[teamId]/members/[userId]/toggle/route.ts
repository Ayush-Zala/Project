import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggles the active status of a team member in an organization team.
 * Optimized for descriptive activity logging.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string; userId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = Number(resolvedParams.id);
  const teamId = Number(resolvedParams.teamId);
  const targetUserId = Number(resolvedParams.userId);
  const userId = Number(session.user.id);

  const allowed = await hasPermission(userId, "organisation:team:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // 1. Fetch current status and parent names for logging
    const membership = await (prisma as any).organisationTeamMember.findFirst({
      where: { teamId, userId: targetUserId },
      include: {
        team: {
          select: { name: true, organisation: { select: { name: true } } }
        },
        user: {
          select: { name: true }
        }
      }
    });

    if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

    const newStatus = !membership.isActive;

    // 2. Perform Update
    const updated = await (prisma as any).organisationTeamMember.update({
      where: { id: membership.id },
      data: { 
        isActive: newStatus,
        updatedBy: userId,
        updatedAt: BigInt(Date.now())
      }
    });

    // 3. Emit Event with Rich Metadata for Logs
    // Custom description as per USER request: "organisation team meber mark inactive/active in {team} of {organisaiton}"
    const statusText = newStatus ? "active" : "inactive";
    const logDescription = `Organisation team member ${membership.user.name} marked ${statusText} in team ${membership.team.name} of organization ${membership.team.organisation.name}`;

    await emitEvent("ORGANISATION_TEAM_MEMBERS_CHANGED", { 
      action: "member_status_toggled", 
      organisationId: String(orgId),
      teamId: String(teamId),
      userId: String(targetUserId),
      isActive: newStatus,
      description: logDescription,
      teamName: membership.team.name,
      organisationName: membership.team.organisation.name
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[TEAM_MEMBER_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
