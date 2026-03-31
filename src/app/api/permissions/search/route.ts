import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/rbac";

/**
 * GET: Non-paginated search for permissions (autocomplete).
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "permissions:read") || 
                  await hasPermission(userId, "roles:assign_permission");
  
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const permissions = await (prisma as any).permission.findMany({
      where: query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ]
      } : {},
      take: 1000,
      orderBy: { slug: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        resource: true,
        isActive: true,
      }
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("[PERMISSIONS_SEARCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
