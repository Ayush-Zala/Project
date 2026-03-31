import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import * as z from "zod";

const batchAssignSchema = z.object({
  permissionIds: z.array(z.number()),
});

/**
 * GET: Fetch all permissions for a specific role.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleId = parseInt(idStr);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "roles:read") || 
                  await hasPermission(userId, "roles:assign_permission");
  
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rolePermissions = await (prisma as any).rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: { id: true, name: true, slug: true, resource: true, action: true, isActive: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(rolePermissions);
  } catch (error) {
    console.error("[ROLE_PERMISSIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Batch assign permissions to a role.
 * Resyncs the role_permissions table for this role.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "roles:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roleId = parseInt(idStr);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = batchAssignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { permissionIds } = result.data;

    // Use transaction for consistency
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Delete existing assignments (not ideal for audit trail, but simplest for "industrial" sync)
      // Actually, let's just create what's missing and deactivate what's not in the list if we want status preservation.
      // But for a simple "Set permissions" UI, a full sync is often expected.
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      // 2. Insert new assignments
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pId: number) => ({
            roleId,
            permissionId: pId,
            isActive: true,
            createdBy: Number(session.user.id),
          }))
        });
      }
    });

    await emitEvent("ROLE_PERMISSIONS_CHANGED", { action: "assigned", roleId });

    return NextResponse.json({ message: "Permissions assigned successfully" });
  } catch (error) {
    console.error("[ROLE_PERMISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
