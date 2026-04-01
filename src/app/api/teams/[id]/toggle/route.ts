import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggles the isActive status of a team.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canToggle = await hasPermission(userId, "teams:toggle");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canToggle) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    // Visibility Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { members: { some: { userId, isActive: true } } }
          ]
        }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id },
      select: { isActive: true }
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const updatedTeam = await (prisma as any).team.update({
      where: { id },
      data: {
        isActive: !team.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    // Broadcast
    await emitEvent("TEAMS_CHANGED", { 
      action: "toggled", 
      teamId: id,
      isActive: updatedTeam.isActive 
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error("[TEAM_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
