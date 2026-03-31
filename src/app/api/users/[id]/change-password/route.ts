import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, "Security Protocol: 8+ chars required")
    .regex(/[A-Z]/, "Security Protocol: Uppercase missing")
    .regex(/[a-z]/, "Security Protocol: Lowercase missing")
    .regex(/[0-9]/, "Security Protocol: Number missing")
    .regex(/[^A-Za-z0-9]/, "Security Protocol: Special character missing"),
  confirmPassword: z.string().min(1, "Confirmation required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Security Mismatch: Passwords do not match",
  path: ["confirmPassword"],
});

/**
 * PATCH: Changes a user's password.
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
    const body = await req.json();
    const result = passwordResetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { password } = result.data;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the record in the Account table
    await (prisma as any).account.updateMany({
      where: { userId, providerId: "credential" },
      data: {
        password: passwordHash,
        updatedAt: BigInt(Date.now()),
      },
    });

    // Also update the User row's updatedAt
    await (prisma as any).user.update({
      where: { id: userId },
      data: { updatedAt: BigInt(Date.now()) },
    });

    // Broadcast
    await emitEvent("USERS_CHANGED", { action: "password_changed", userId });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[USER_CHANGE_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
