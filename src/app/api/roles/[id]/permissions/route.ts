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

    // Fetch current permissions assigned to this role
    const existing = await (prisma as any).rolePermission.findMany({
      where: { roleId },
      select: { id: true, permissionId: true },
    });

    const existingIds = new Set<number>(existing.map((e: any) => e.permissionId));
    const incomingIds = new Set<number>(permissionIds);

    // Compute diff
    const toRevoke = existing.filter((e: any) => !incomingIds.has(e.permissionId));
    const toAssign = permissionIds.filter((pId: number) => !existingIds.has(pId));

    // Step 1: Delete revoked permissions individually → extension logs each as ASSIGN (revoke)
    for (const rp of toRevoke) {
      await (prisma as any).rolePermission.delete({ where: { id: rp.id } });
    }

    // Step 2: Create new permissions individually → extension logs each as ASSIGN (grant)
    for (const pId of toAssign) {
      await (prisma as any).rolePermission.create({
        data: { roleId, permissionId: pId, isActive: true, createdBy: userId },
      });
    }

    await emitEvent("ROLE_PERMISSIONS_CHANGED", { action: "assigned", roleId });

    return NextResponse.json({ message: "Permissions assigned successfully" });
  } catch (error) {
    console.error("[ROLE_PERMISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
