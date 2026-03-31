import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

import { isUserToggleableBy } from "@/lib/hierarchy";

/**
 * PATCH: Toggles the isActive status of a user.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "users:toggle");
  if (!allowed) return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 🛡️ Hierarchy Check: Cannot toggle if target is Peer or Superior
  const canToggle = await isUserToggleableBy(id, userId);
  if (!canToggle) {
     return NextResponse.json({ error: "Forbidden: Hierarchy violation. You cannot toggle status for your peers or superiors." }, { status: 403 });
  }

  // Prevent self-toggle
  if (userId === id) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id },
      select: {
        isActive: true,
        userRoles: {
          where: { isActive: true },
          take: 1,
          select: { role: { select: { slug: true } } }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Flatten role for easier check
    const roleSlug = user.userRoles?.[0]?.role?.slug;

    // Prevent deactivation of Super Admin
    if (roleSlug === 'super-admin' && user.isActive) {
      return NextResponse.json(
        { error: "This user is a Super Admin and cannot be deactivated." },
        { status: 403 }
      );
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
        updatedAt: BigInt(Date.now()),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      }
    });

    // 🛡️ Industrial Security: If suspended, physically purge all active sessions
    if (!updatedUser.isActive) {
      await (prisma as any).session.deleteMany({
        where: { userId: id }
      });
      console.log(`[SECURITY] Purged active sessions for suspended user: ${updatedUser.email}`);
    }

    // Broadcast status change for real-time client-side logout
    await emitEvent("USERS_CHANGED", { 
      action: "toggled", 
      userId: id,
      isActive: updatedUser.isActive 
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
