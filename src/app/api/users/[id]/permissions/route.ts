import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";
import * as z from "zod";

const directAssignSchema = z.object({
  permissionIds: z.array(z.number()),
});

/**
 * GET: Fetch all direct permissions for a specific user.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(idStr);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Only those who can manage users or read users should see this
  const allowed = await hasPermission(Number(session.user.id), "users:read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const directPermissions = await (prisma as any).userPermission.findMany({
      where: { userId },
      include: {
        permission: {
          select: { id: true, name: true, slug: true, resource: true, action: true, isActive: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(directPermissions);
  } catch (error) {
    console.error("[USER_PERMISSIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Assign permissions directly to a user.
 * Explicitly requested: "cross checking that permission is already not added by existing user role so it doesnot overwrite"
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "users:assign_permission");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = parseInt(idStr);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = directAssignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { permissionIds } = result.data;

    // Fetch existing role-based permission IDs for this user
    const existingRoles = await (prisma as any).userRole.findMany({
      where: { userId, isActive: true, role: { isActive: true } },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: { isActive: true, permission: { isActive: true } },
              select: { permissionId: true }
            }
          }
        }
      }
    });

    const rolePermissionIDs = new Set<number>();
    existingRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        rolePermissionIDs.add(rp.permissionId);
      });
    });

    // Filter out permissions that the user already has via their roles
    const filteredIds = permissionIds.filter((pId: number) => !rolePermissionIDs.has(pId));

    if (filteredIds.length === 0 && permissionIds.length > 0) {
      return NextResponse.json({ 
        message: "All selected permissions are already granted via the user's role.",
        skipped: true 
      });
    }

    await (prisma as any).$transaction(async (tx: any) => {
      // For direct assignments, we might want to sync as well
      await tx.userPermission.deleteMany({
        where: { userId }
      });

      if (filteredIds.length > 0) {
        await tx.userPermission.createMany({
          data: filteredIds.map((pId: number) => ({
            userId,
            permissionId: pId,
            isActive: true,
            createdBy: Number(session.user.id),
          }))
        });
      }
    });

    await emitEvent("USER_PERMISSIONS_CHANGED", { action: "assigned", userId });

    return NextResponse.json({ 
      message: "Direct permissions assigned successfully", 
      count: filteredIds.length,
      ignoredDueToRole: permissionIds.length - filteredIds.length 
    });
  } catch (error) {
    console.error("[USER_PERMISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
