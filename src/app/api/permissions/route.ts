import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const permissionCreateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  resource: z.string().min(2, "Resource is required"),
  action: z.string().min(2, "Action is required"),
  description: z.string().max(200).optional().nullable(),
});

import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

/**
 * GET: Paginated list and search for permissions.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to read permissions
  const allowed = await hasPermission(Number(session.user.id), "permissions:read");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: You do not have permissions:read access" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
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
          { resource: { contains: search, mode: "insensitive" as const } },
          { action: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {};

    // 2. Build advanced filters where
    const advancedWhere = getPrismaWhere(filters);

    // 3. Combine with AND
    const where = {
        AND: [searchWhere, advancedWhere]
    };

    const orderBy = getPrismaOrderBy(sort) || { id: 'asc' };

    const [total, permissions] = await Promise.all([
      (prisma as any).permission.count({ where }),
      (prisma as any).permission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    return NextResponse.json({
      permissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[PERMISSIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new permission.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(Number(session.user.id), "permissions:create");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = permissionCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, resource, action, description } = result.data;
    const slug = `${resource.toLowerCase()}:${action.toLowerCase()}`;

    const existing = await (prisma as any).permission.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A permission with this resource:action slug already exists" }, { status: 400 });
    }

    const permission = await (prisma as any).permission.create({
      data: {
        name,
        slug,
        resource,
        action,
        description,
        createdBy: Number(session.user.id),
      },
    });

    await emitEvent("PERMISSIONS_CHANGED", { action: "created", permissionId: permission.id });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error("[PERMISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
