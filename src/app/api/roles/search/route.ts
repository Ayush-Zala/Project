import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET: Handles non-paginated search for roles.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term") || "";

  try {
    const roles = await (prisma as any).role.findMany({
      where: term ? {
        OR: [
          { name: { contains: term, mode: 'insensitive' as const } },
          { slug: { contains: term, mode: 'insensitive' as const } },
        ]
      } : {},
      orderBy: { name: 'asc' },
      take: 20,
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("[ROLES_SEARCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
