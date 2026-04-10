import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET: Fetch all Active Industries
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const industries = await (prisma as any).industry.findMany({
      where: {
        isActive: true,
        ...(search ? {
          name: { contains: search, mode: "insensitive" }
        } : {})
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(industries);
  } catch (error) {
    console.error("[INDUSTRIES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
