import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * GET: Fetches a single role by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "roles:read");
  if (!allowed) return NextResponse.json({ error: "Forbidden: You do not have roles:read access" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const role = await (prisma as any).role.findUnique({
      where: { id },
      include: {
        parent: { select: { name: true, id: true } }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Updates a role.
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

  const allowed = await hasPermission(Number(session.user.id), "roles:update");
  if (!allowed) return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description, colorCode, parentId, isActive } = body;

    // 🛡️ Apex Protection: Prevent deactivation of Super Admin
    const existingRole = await (prisma as any).role.findUnique({ where: { id } });
    if (!existingRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    if (existingRole.slug === 'super-admin' && typeof isActive === "boolean" && !isActive) {
      return NextResponse.json(
        { error: "Forbidden: The Super Admin role is the system apex and cannot be deactivated." },
        { status: 403 }
      );
    }

    const role = await (prisma as any).role.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        colorCode: colorCode !== undefined ? colorCode : undefined,
        parentId: parentId === undefined ? undefined : (parentId ? parseInt(parentId) : null),
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        updatedBy: Number(session.user.id),
      },
      include: {
        parent: {
          select: { name: true }
        }
      }
    });

    // Real-time broadcast: update
    await emitEvent("ROLES_CHANGED", { action: "updated", roleId: id })

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Permanently removes a role.
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

  const allowed = await hasPermission(Number(session.user.id), "roles:delete");
  if (!allowed) return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // 🛡️ Apex Protection: Prevent deletion of Super Admin
    const roleToDelete = await (prisma as any).role.findUnique({ where: { id } });
    if (!roleToDelete) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    if (roleToDelete.slug === 'super-admin') {
       return NextResponse.json(
         { error: "Forbidden: The Super Admin role is mission-critical and cannot be purged." },
         { status: 403 }
       );
    }

    await (prisma as any).role.delete({
      where: { id },
    });

    // Real-time broadcast: delete
    await emitEvent("ROLES_CHANGED", { action: "deleted", roleId: id })

    return NextResponse.json({ message: "Role deleted permanently" });
  } catch (error) {
    console.error("[ROLE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
