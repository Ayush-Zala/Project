import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

/**
 * GET: Handles forensic retrieval of Audit Logs with advanced filtering and pagination.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  // 🛡️ Security Check: Only users with 'audit:read' or 'super-admin' capacity should see these logs
  const allowed = await hasPermission(userId, "audit:read");
  // Temporary fallback: if audit:read doesn't exist yet, allow if user can manage roles
  const fallbackAllowed = await hasPermission(userId, "roles:manage");
  
  if (!allowed && !fallbackAllowed) {
    return NextResponse.json({ error: "Forbidden: Forensic access denied" }, { status: 403 });
  }

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("per_page") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "createdAt.desc";
  const filtersRaw = searchParams.get("filters") || "[]";
  
  let filters: ExtendedColumnFilter[] = [];
  try {
    filters = JSON.parse(filtersRaw);
  } catch (e) {
    console.warn("Invalid filters ignored");
  }

  const skip = (page - 1) * limit;

  try {
    // 1. Build general search (across Resource, Action, and Reason)
    const searchWhere = search
      ? {
        OR: [
          { resource: { contains: search, mode: "insensitive" as const } },
          { action: { contains: search, mode: "insensitive" as const } },
          { reason: { contains: search, mode: "insensitive" as const } },
          { user: { email: { contains: search, mode: "insensitive" as const } } }
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

    const [total, logs] = await Promise.all([
      (prisma as any).auditLog.count({ where }),
      (prisma as any).auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { 
              name: true,
              email: true,
              image: true
            }
          },
          createdByUser: {
            select: {
              name: true,
              email: true,
              image: true
            }
          }
        }
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOGS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
