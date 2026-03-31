import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

/**
 * PATCH: Toggles the isActive status of a role.
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

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const role = await (prisma as any).role.findUnique({
      where: { id },
      select: { 
        isActive: true,
        slug: true
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // 🛡️ SECURITY GUARD: Prevent deactivation of Super Admin
    if (role.slug === 'super-admin' && role.isActive) {
      return NextResponse.json(
        { error: "The Super Admin role is protected and cannot be deactivated." }, 
        { status: 403 }
      );
    }

    const updatedRole = await (prisma as any).role.update({
      where: { id },
      data: {
        isActive: !role.isActive,
        updatedBy: Number(session.user.id),
      },
      include: {
        parent: {
          select: { name: true }
        }
      }
    });

    // 🔔 Real-time broadcast: status toggled
    await emitEvent("ROLES_CHANGED", { action: "toggled", roleId: id, isActive: updatedRole.isActive })

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("[ROLE_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
