import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggles the isActive status of a team member.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  const { id: teamIdStr, memberId: memberIdStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canToggle = await hasPermission(userId, "team_members:toggle");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canToggle) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamId = parseInt(teamIdStr);
  const memberId = parseInt(memberIdStr);
  if (isNaN(teamId) || isNaN(memberId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Isolation Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: {
          id: teamId,
          OR: [
            { createdBy: userId },
            { members: { some: { userId, isActive: true } } }
          ]
        }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const member = await (prisma as any).teamMember.findUnique({
      where: { id: memberId, teamId }
    });

    if (!member) return NextResponse.json({ error: "Team member not found" }, { status: 404 });

    const updatedMember = await (prisma as any).teamMember.update({
      where: { id: memberId },
      data: {
        isActive: !member.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAM_MEMBERS_CHANGED", { 
      action: "toggled", 
      teamId, 
      memberId, 
      isActive: updatedMember.isActive 
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("[TEAM_MEMBER_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
