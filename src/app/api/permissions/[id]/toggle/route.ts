import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggle status of a permission.
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

  const allowed = await hasPermission(Number(session.user.id), "permissions:toggle");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const permission = await (prisma as any).permission.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!permission) return NextResponse.json({ error: "Permission not found" }, { status: 404 });

    const updated = await (prisma as any).permission.update({
      where: { id },
      data: {
        isActive: !permission.isActive,
        updatedAt: BigInt(Date.now()),
        updatedBy: Number(session.user.id),
      },
    });

    await emitEvent("PERMISSIONS_CHANGED", { action: "toggled", permissionId: id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PERMISSION_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
