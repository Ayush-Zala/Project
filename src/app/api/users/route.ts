import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const userCreateSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  email: z.string().email("Invalid industrial email address"),
  roleId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  password: z.string()
    .min(8, "Security Protocol: 8+ chars required")
    .regex(/[A-Z]/, "Security Protocol: Uppercase missing")
    .regex(/[a-z]/, "Security Protocol: Lowercase missing")
    .regex(/[0-9]/, "Security Protocol: Number missing")
    .regex(/[^A-Za-z0-9]/, "Security Protocol: Special character missing"),
});

import { isRoleAssignableBy, isUserToggleableBy } from "@/lib/hierarchy";

/**
 * GET: Handles paginated list and search functionality for users.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "users:read");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: You do not have users:read access" }, { status: 403 });
  }

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("per_page") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "";
  const filtersRaw = searchParams.get("filters") || "[]";

  let filters: ExtendedColumnFilter[] = [];
  try {
    filters = JSON.parse(filtersRaw);
  } catch (e) {
    console.warn("Invalid filters ignored");
  }

  const skip = (page - 1) * limit;

  try {
    // 1. Build general search where
    const searchWhere = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {};

    // 2. Build advanced filters where
    const advancedWhere = getPrismaWhere(filters);

    // 3. Combine with AND
    const where = {
      AND: [searchWhere, advancedWhere]
    };

    const orderBy = getPrismaOrderBy(sort);

    const [total, users] = await Promise.all([
      (prisma as any).user.count({ where }),
      (prisma as any).user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          userRoles: {
            where: { isActive: true },
            take: 1,
            select: {
              role: {
                select: { id: true, name: true, colorCode: true, slug: true },
              },
            },
          },
        },
      }),
    ]);

    // 🛡️ Hierarchy Check: Determine toggleability for the current user
    const normalized = await Promise.all(users.map(async (u: any) => ({
      ...u,
      role: u.userRoles[0]?.role ?? null,
      userRoles: undefined,
      isToggleable: await isUserToggleableBy(u.id, userId)
    })));

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
// POST /api/users  — Create a new user 
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "users:create");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = userCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, roleId } = result.data;

    // 🛡️ Hierarchy Check: Cannot assign parent roles
    const canAssign = await isRoleAssignableBy(Number(roleId), userId);
    if (!canAssign) {
      return NextResponse.json({ error: "Forbidden: Hierarchy violation. You cannot assign a superior/parent role." }, { status: 403 });
    }

    // Unique-email guard
    const existing = await (prisma as any).user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password 
    const passwordHash = await bcrypt.hash(password, 10);

    // 🔧 FORENSIC PROTOCOL: Consolidate logs into a single high-fidelity record
    // We suppress automatic audits for User, Account, and UserRole within this scope.
    const { setAuditSuppression } = await import("@/lib/audit-context");
    setAuditSuppression(true);

    // Create user + account in a transaction
    const user = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Create the user profile row
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: true,
          isActive: true,
          createdBy: userId,
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
            createdBy: userId,
          },
        });
      }

      return newUser;
    });

    // 🏗️ MANUAL FORENSIC EMISSION: Clean Architecture
    // Now that the transaction is successful, we create the single consolidated log.
    const targetRole = await (prisma as any).role.findUnique({ where: { id: Number(roleId) } });
    const auditReason = `User ${user.email} created and assigned Role ${targetRole?.name || "Standard"}`;

    await (prisma as any).auditLog.create({
      data: {
        userId: null, // The Actor
        createdBy: userId,
        action: "CREATE",
        resource: "user",
        status: "SUCCESS",
        reason: auditReason,
        metaData: {
          userId: user.id,
          roleId: Number(roleId),
          roleName: targetRole?.name,
          email: user.email
        }
      }
    });

    // Restore suppression for any subsequent operations in this request if needed (optional)
    setAuditSuppression(false);

    // Fetch the created user with role for the response
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

    // Broadcast to all dashboard clients
    await emitEvent("USERS_CHANGED", { action: "created", userId: user.id });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[USERS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
