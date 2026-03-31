import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

/**
 * PATCH: Toggles the isActive status of a user.
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

  // Prevent self-toggle
  if (Number(session.user.id) === id) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id },
      select: {
        isActive: true,
        userRoles: {
          where: { isActive: true },
          take: 1,
          select: { role: { select: { slug: true } } }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Flatten role for easier check
    const roleSlug = user.userRoles?.[0]?.role?.slug;

    // Prevent deactivation of Super Admin
    if (roleSlug === 'super-admin' && user.isActive) {
      return NextResponse.json(
        { error: "This user is a Super Admin and cannot be deactivated." },
        { status: 403 }
      );
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
        updatedAt: BigInt(Date.now()),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      }
    });

    // Broadcast
    await emitEvent("USERS_CHANGED", { action: "toggled", userId: id });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
