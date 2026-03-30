import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

/**
 * POST: Assigns a single role to a user (overwrites existing).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(idStr);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { roleId } = await req.json();

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    await (prisma as any).$transaction(async (tx: any) => {
      // Delete existing roles for this user (since only single-role is allowed)
      await tx.userRole.deleteMany({
        where: { userId }
      });

      // Assign the new role
      await tx.userRole.create({
        data: {
          userId,
          roleId: Number(roleId),
          createdBy: Number(session.user.id),
        }
      });
    });

    // 🔔 Broadcast
    await emitEvent("USERS_CHANGED", { action: "role_assigned", userId });

    return NextResponse.json({ message: "Role assigned successfully" });
  } catch (error) {
    console.error("[USER_ASSIGN_ROLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
