import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

const roleCreateSchema = z.object({
  name: z.string()
    .min(3, "Role Manifest: Name must be at least 3 characters")
    .max(40, "Role Manifest: Name must not exceed 40 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Role Manifest: Special characters are forbidden"),
  description: z.string().max(200, "Description too long").optional().nullable(),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color-hex protocol"),
  parentId: z.union([z.string(), z.number(), z.null()]).optional().transform(v =>
    (v === null || v === "none" || v === "") ? null : Number(v)
  ),
});

import { isRoleManagedBy, isRoleAssignableBy } from "@/lib/hierarchy";

/**
 * GET: Handles paginated list and search functionality for roles.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "roles:read");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: You do not have roles:read access" }, { status: 403 });
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
          { slug: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
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

    const [total, roles] = await Promise.all([
      (prisma as any).role.count({ where }),
      (prisma as any).role.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          parent: {
            select: { name: true }
          }
        }
      }),
    ]);

    // 🛡️ Hierarchy Check: Determine manageability and assignability for the current user
    const enrichedRoles = await Promise.all(roles.map(async (role: any) => ({
      ...role,
      isManageable: await isRoleManagedBy(role.id, userId),
      isAssignable: await isRoleAssignableBy(role.id, userId)
    })));

    return NextResponse.json({
      roles: enrichedRoles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ROLES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Handles role creation.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(Number(session.user.id), "roles:create");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = roleCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, description, colorCode, parentId } = result.data;

    const slug = slugify(name);

    const existing = await (prisma as any).role.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A role with a similar name already exists" }, { status: 400 });
    }

    const role = await (prisma as any).role.create({
      data: {
        name,
        slug,
        description,
        colorCode,
        parentId,
        createdBy: Number(session.user.id),
      },
      include: {
        parent: {
          select: { name: true }
        }
      }
    });

    // Notify all connected clients of the change
    await emitEvent("ROLES_CHANGED", { action: "created", roleId: role.id })

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
