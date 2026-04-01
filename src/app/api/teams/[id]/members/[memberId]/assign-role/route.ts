import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const assignRoleSchema = z.object({
  roleId: z.number(),
});

/**
 * POST: Assign a team role to a member
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  const { id: teamIdStr, memberId: memberIdStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canAssign = await hasPermission(userId, "team_members:assign_role");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canAssign) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const body = await req.json();
    const result = assignRoleSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { roleId } = result.data;

    // Verify member exists and belongs to the team
    const member = await (prisma as any).teamMember.findUnique({
      where: { id: memberId, teamId }
    });
    if (!member) return NextResponse.json({ error: "Team member not found" }, { status: 404 });

    // Verify role exists and belongs to the team
    const role = await (prisma as any).teamRole.findUnique({
      where: { id: roleId, teamId }
    });
    if (!role) return NextResponse.json({ error: "Team role not found" }, { status: 404 });

    // Assign role
    const assigned = await (prisma as any).teamMemberRole.upsert({
      where: { teamMemberId_teamRoleId: { teamMemberId: memberId, teamRoleId: roleId } },
      update: {},
      create: {
        teamMemberId: memberId,
        teamRoleId: roleId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAM_MEMBERS_CHANGED", { action: "role_assigned", teamId, memberId, roleId });
    return NextResponse.json(assigned);
  } catch (error) {
    console.error("[TEAM_MEMBER_ASSIGN_ROLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
