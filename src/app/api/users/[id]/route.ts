import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

// ── Shared helper: fetch a user with role ──────────────────────
async function getUserWithRole(id: number) {
  const user = await (prisma as any).user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true,
      emailVerified: true, isActive: true,
      image: true, createdAt: true, updatedAt: true, createdBy: true,
      userRoles: {
        where: { isActive: true },
        take: 1,
        select: {
          role: { select: { id: true, name: true, colorCode: true, slug: true } },
        },
      },
    },
  });
  if (!user) return null;
  return { ...user, role: user.userRoles[0]?.role ?? null, userRoles: undefined };
}

// ─────────────────────────────────────────────────────────────
// GET /api/users/[id]
// ─────────────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const user = await getUserWithRole(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/[id]  — Update name / email
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const { name, email, roleId } = body;

    // Guard against email conflicts if email changed
    if (email) {
      const conflict = await (prisma as any).user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    // ── Update in a transaction to handle role assignment ────────
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update user profile
      await tx.user.update({
        where: { id },
        data: { 
          ...(name && { name }), 
          ...(email && { email }), 
          updatedAt: BigInt(Date.now()) 
        },
      });

      // 2. Update role if roleId provided
      if (roleId) {
        // Delete existing roles (single-role policy)
        await tx.userRole.deleteMany({ where: { userId: id } });
        
        // Assign new role
        await tx.userRole.create({
          data: {
            userId: id,
            roleId: Number(roleId),
            createdBy: Number(session.user.id),
          }
        });
      }
    });

    const updated = await getUserWithRole(id);

    // 🔔 Broadcast
    await emitEvent("USERS_CHANGED", { action: "updated", userId: id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[USER_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/users/[id]  — Permanent delete (cascades sessions)
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Prevent self-deletion
  if (Number(session.user.id) === id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    // Delete user; Prisma cascades: sessions, accounts, userRoles, etc.
    await (prisma as any).user.delete({ where: { id } });

    // 🔔 Broadcast
    await emitEvent("USERS_CHANGED", { action: "deleted", userId: id });

    return NextResponse.json({ message: "User deleted permanently" });
  } catch (error) {
    console.error("[USER_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
