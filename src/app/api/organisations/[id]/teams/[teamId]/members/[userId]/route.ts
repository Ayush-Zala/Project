import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * DELETE: Remove a specific member from an Organisation Team
 */
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string, teamId: string, userId: string }> }
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
    // 🛡️ Note: We use deleteMany to ensure we only delete if it exists and matches the team
    const result = await (prisma as any).organisationTeamMember.deleteMany({
      where: {
        teamId: teamId,
        userId: targetUserId
      }
    });

    if (result.count > 0) {
        await emitEvent("ORGANISATION_TEAM_MEMBERS_CHANGED", { 
            action: "removed", 
            organisationId: String(orgId), 
            teamId: String(teamId),
            userId: String(targetUserId)
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEAM_MEMBER_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
