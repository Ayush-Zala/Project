import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import * as z from "zod";

const permissionUpdateSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET: Fetch permission details.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const allowed = await hasPermission(Number(session.user.id), "permissions:read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const permission = await (prisma as any).permission.findUnique({ where: { id } });
    if (!permission) return NextResponse.json({ error: "Permission not found" }, { status: 404 });

    return NextResponse.json(permission);
  } catch (error) {
    console.error("[PERMISSION_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update permission.
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

  const allowed = await hasPermission(Number(session.user.id), "permissions:update");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = permissionUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const updated = await (prisma as any).permission.update({
      where: { id },
      data: {
        ...result.data,
        updatedAt: BigInt(Date.now()),
        updatedBy: Number(session.user.id),
      },
    });

    await emitEvent("PERMISSIONS_CHANGED", { action: "updated", permissionId: id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PERMISSION_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Permanently remove a permission.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(Number(session.user.id), "permissions:delete");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    await (prisma as any).permission.delete({ where: { id } });
    await emitEvent("PERMISSIONS_CHANGED", { action: "deleted", permissionId: id });

    return NextResponse.json({ message: "Permission deleted" });
  } catch (error) {
    console.error("[PERMISSION_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
