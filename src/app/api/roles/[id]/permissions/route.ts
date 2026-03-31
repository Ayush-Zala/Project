import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import { isRoleManagedBy, getUserCapabilities } from "@/lib/hierarchy";
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

  const userId = Number(session.user.id);
  const roleId = parseInt(idStr);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const allowed = await hasPermission(userId, "roles:read") || 
                  await hasPermission(userId, "roles:assign_permission");
  
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 🛡️ Hierarchy Check: Cannot view assignments for Self or Parent Roles
  const isManaged = await isRoleManagedBy(roleId, userId);
  if (!isManaged) {
     return NextResponse.json({ error: "Forbidden: You cannot manage your own or superior roles." }, { status: 403 });
  }

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

  const userId = Number(session.user.id);
  const roleId = parseInt(idStr);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const allowed = await hasPermission(userId, "roles:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 🛡️ Hierarchy Check: Cannot modify assignments for Self or Parent Roles
  const isManaged = await isRoleManagedBy(roleId, userId);
  if (!isManaged) {
     return NextResponse.json({ error: "Forbidden: Access hierarchy violation detected." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = batchAssignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { permissionIds } = result.data;

    // 🛡️ Vertical Constraint: Cannot grant what you don't have
    const userCaps = await getUserCapabilities(userId);
    const targetPerms = await (prisma as any).permission.findMany({
       where: { id: { in: permissionIds } },
       select: { slug: true }
    });

    const hasUnauthorizedPerm = targetPerms.some((p: any) => !userCaps.includes(p.slug));
    if (hasUnauthorizedPerm) {
       console.error(`[BREACH_PREVENTION] User ${userId} tried to assign unauthorized permissions to role ${roleId}`);
       return NextResponse.json({ error: "Forbidden: You cannot grant permissions that you do not hold." }, { status: 403 });
    }

    // Use transaction for consistency
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Delete existing assignments
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
            createdBy: userId,
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
