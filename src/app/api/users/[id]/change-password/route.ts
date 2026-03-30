import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { emitEvent } from "@/lib/socket-emit";

/**
 * PATCH: Changes a user's password (admin action).
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

  const userId = parseInt(idStr);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { password, confirmPassword } = await req.json();

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Password and Confirm Password are required" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    // ── Hash password ───────────────
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the record in the Account table
    await (prisma as any).account.updateMany({
      where: { userId, providerId: "credential" },
      data: {
        password: passwordHash,
        updatedAt: BigInt(Date.now()),
      },
    });

    // Option: also update the User row's updatedAt
    await (prisma as any).user.update({
      where: { id: userId },
      data: { updatedAt: BigInt(Date.now()) },
    });

    // 🔔 Broadcast
    await emitEvent("USERS_CHANGED", { action: "password_changed", userId });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[USER_CHANGE_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
