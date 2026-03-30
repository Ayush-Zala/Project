import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

/**
 * GET: Fetch the current user's profile details.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: Number(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update the current user's profile identity (Name).
 */
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Valid name is required" }, { status: 400 });
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id: Number(session.user.id) },
      data: { 
        name: name.trim(),
        updatedAt: BigInt(Date.now())
      },
    });

    // 🔔 Broadcast change (helpful if user is logged in on multiple devices)
    await emitEvent("USERS_CHANGED", { action: "profile_updated", userId: updatedUser.id });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });
  } catch (error) {
    console.error("[PROFILE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
