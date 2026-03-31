import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggle status of a specific user-permission assignment.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "users:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const existing = await (prisma as any).userPermission.findUnique({
      where: { id },
      select: { isActive: true, userId: true }
    });
    if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const updated = await (prisma as any).userPermission.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        updatedAt: BigInt(Date.now()),
        updatedBy: Number(session.user.id)
      }
    });

    await emitEvent("USER_PERMISSIONS_CHANGED", { action: "toggled", id, userId: existing.userId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[USER_PERMISSION_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove a specific user-permission assignment.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "users:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const existing = await (prisma as any).userPermission.findUnique({
      where: { id },
      select: { userId: true }
    });
    if (!existing) return NextResponse.json({ message: "Assignment already deleted" });

    await (prisma as any).userPermission.delete({ where: { id } });

    await emitEvent("USER_PERMISSIONS_CHANGED", { action: "deleted", id, userId: existing.userId });

    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("[USER_PERMISSION_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
