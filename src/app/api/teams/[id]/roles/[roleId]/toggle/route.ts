import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggles the isActive status of a team role.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string, roleId: string }> }
) {
  const { id: teamIdStr, roleId: roleIdStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canToggle = await hasPermission(userId, "team_roles:toggle");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canToggle) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamId = parseInt(teamIdStr);
  const roleId = parseInt(roleIdStr);
  if (isNaN(teamId) || isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

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

    const role = await (prisma as any).teamRole.findUnique({
      where: { id: roleId, teamId }
    });

    if (!role) return NextResponse.json({ error: "Team role not found" }, { status: 404 });

    const updatedRole = await (prisma as any).teamRole.update({
      where: { id: roleId },
      data: {
        isActive: !role.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("TEAM_ROLES_CHANGED", { 
      action: "toggled", 
      teamId, 
      roleId, 
      isActive: updatedRole.isActive 
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("[TEAM_ROLE_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
