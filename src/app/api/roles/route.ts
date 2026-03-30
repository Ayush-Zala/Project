import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import { emitEvent } from "@/lib/socket-emit";

/**
 * GET: Handles paginated list and search functionality for roles.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  try {
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [total, roles] = await Promise.all([
      (prisma as any).role.count({ where }),
      (prisma as any).role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          parent: {
            select: { name: true }
          }
        }
      }),
    ]);

    return NextResponse.json({
      roles,
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

  try {
    const body = await req.json();
    const { name, description, colorCode, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if slug already exists
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
        parentId: parentId ? parseInt(parentId) : null,
        createdBy: Number(session.user.id),
      },
      include: {
        parent: {
          select: { name: true }
        }
      }
    });

    // 🔔 Notify all connected clients of the change
    await emitEvent("ROLES_CHANGED", { action: "created", roleId: role.id })

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
