import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggle status of a global role.
 * Path: /api/roles/[id]/toggle
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
  const allowed = await hasPermission(userId, "roles:update"); // Using roles:update as roles:toggle might not exist in manifest
  if (!allowed) return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const { isActive: manualStatus } = body;

    // 🛡️ Apex Protection: Prevent toggling off Super Admin
    const roleSnapshot = await (prisma as any).role.findUnique({
      where: { id },
      select: { isActive: true, slug: true, name: true }
    });

    if (!roleSnapshot) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const nextStatus = typeof manualStatus === "boolean" ? manualStatus : !roleSnapshot.isActive;

    if (roleSnapshot.slug === 'super-admin' && roleSnapshot.isActive && !nextStatus) {
      return NextResponse.json(
        { error: "Forbidden: The Super Admin role is the system apex and cannot be deactivated." },
        { status: 403 }
      );
    }

    const updated = await (prisma as any).role.update({
      where: { id },
      data: {
        isActive: nextStatus,
        updatedAt: BigInt(Date.now()),
        updatedBy: userId,
      },
    });

    // Notify all connected clients of the change
    await emitEvent("ROLES_CHANGED", { action: "updated", roleId: id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ROLE_TOGGLE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
