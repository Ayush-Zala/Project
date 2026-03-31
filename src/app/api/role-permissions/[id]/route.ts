import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggle status of a specific role-permission assignment.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Simplified permission for role-permission management
  const allowed = await hasPermission(Number(session.user.id), "roles:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const existing = await (prisma as any).rolePermission.findUnique({
      where: { id },
      select: { isActive: true, roleId: true }
    });
    if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const updated = await (prisma as any).rolePermission.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        updatedAt: BigInt(Date.now()),
        updatedBy: Number(session.user.id)
      }
    });

    await emitEvent("ROLE_PERMISSIONS_CHANGED", { action: "toggled", id, roleId: existing.roleId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ROLE_PERMISSION_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove a specific role-permission assignment.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "roles:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const existing = await (prisma as any).rolePermission.findUnique({
      where: { id },
      select: { roleId: true }
    });
    if (!existing) return NextResponse.json({ message: "Assignment already deleted" });

    await (prisma as any).rolePermission.delete({ where: { id } });

    await emitEvent("ROLE_PERMISSIONS_CHANGED", { action: "deleted", id, roleId: existing.roleId });

    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("[ROLE_PERMISSION_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
