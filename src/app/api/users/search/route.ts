import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission } from "@/lib/rbac";

// ─────────────────────────────────────────────────────────────
// Non-paginated search for autocomplete / quick lookups.
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(Number(session.user.id), "users:read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const users = await (prisma as any).user.findMany({
      where: query
        ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
        : {},
      take: 20,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, isActive: true },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[USERS_SEARCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
