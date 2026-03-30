import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { emitEvent } from "@/lib/socket-emit";

// ─────────────────────────────────────────────────────────────
// GET /api/users  — Paginated list with assigned role
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page   = parseInt(searchParams.get("page")  || "1");
  const limit  = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const skip   = (page - 1) * limit;

  try {
    const where = search
      ? {
          OR: [
            { name:  { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      (prisma as any).user.count({ where }),
      (prisma as any).user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          isActive: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          // Include the single assigned role (via UserRole junction)
          userRoles: {
            where: { isActive: true },
            take: 1, // single-role per user
            select: {
              role: {
                select: { id: true, name: true, colorCode: true, slug: true },
              },
            },
          },
        },
      }),
    ]);

    // Flatten userRoles → role for cleaner frontend consumption
    const normalized = users.map((u: any) => ({
      ...u,
      role: u.userRoles[0]?.role ?? null,
      userRoles: undefined,
    }));

    return NextResponse.json({
      users: normalized,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[USERS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/users  — Create a new user (admin action)
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, roleId } = body;

    // ── Validation ────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // ── Unique-email guard ────────────────────────────────────
    const existing = await (prisma as any).user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // ── Hash password (same salt rounds as better-auth) ───────
    const passwordHash = await bcrypt.hash(password, 10);

    // ── Create user + account in a transaction ─────────────────
    const user = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Create the user profile row
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: true,  // auto-verified (admin-created)
          isActive: true,
          createdBy: Number(session.user.id),
        },
      });

      // 2. Create the account row with hashed password
      await tx.account.create({
        data: {
          userId: newUser.id,
          providerId: "credential",
          accountId: email,
          password: passwordHash,
        },
      });

      // 3. Optionally assign role
      if (roleId) {
        await tx.userRole.create({
          data: {
            userId: newUser.id,
            roleId: Number(roleId),
            createdBy: Number(session.user.id),
          },
        });
      }

      return newUser;
    });

    // ── Fetch the created user with role for the response ─────
    const fullUser = await (prisma as any).user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true,
        emailVerified: true, isActive: true, createdAt: true,
        userRoles: {
          where: { isActive: true },
          take: 1,
          select: { role: { select: { id: true, name: true, colorCode: true, slug: true } } },
        },
      },
    });

    const response = {
      ...fullUser,
      role: fullUser.userRoles[0]?.role ?? null,
      userRoles: undefined,
    };

    // 🔔 Broadcast to all dashboard clients
    await emitEvent("USERS_CHANGED", { action: "created", userId: user.id });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[USERS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
