import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// GET /api/users/search?q=john
// Non-paginated search for autocomplete / quick lookups.
// Returns id + name + email only.
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const users = await (prisma as any).user.findMany({
      where: query
        ? {
            OR: [
              { name:  { contains: query, mode: "insensitive" as const } },
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
