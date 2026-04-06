import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { slugify } from "@/lib/utils";

const teamRoleSchema = z.object({
  name: z.string().min(3, "Min 3 characters required").max(50),
  description: z.string().max(255).optional().nullable(),
});

/**
 * GET: List all roles for a team
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  if (isNaN(teamId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const canRead = await hasPermission(userId, "team_roles:read");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Isolation Check
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = await (prisma as any).teamRole.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("[TEAM_ROLES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new role for a team
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const teamId = parseInt(idStr);
  
  const canCreate = await hasPermission(userId, "team_roles:create");
  const canReadAll = await hasPermission(userId, "teams:read_all");
  
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (!canReadAll) {
      const existing = await (prisma as any).team.findFirst({
        where: { id: teamId, OR: [{ createdBy: userId }, { members: { some: { userId, isActive: true } } }] }
      });
      if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = teamRoleSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const slug = slugify(result.data.name);
    const existing = await (prisma as any).teamRole.findUnique({ where: { teamId_slug: { teamId, slug } } });
    if (existing) return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });

    const role = await (prisma as any).teamRole.create({
      data: { ...result.data, slug, teamId, createdBy: userId, updatedBy: userId, createdAt: BigInt(Date.now()), updatedAt: BigInt(Date.now()) }
    });

    await emitEvent("TEAM_ROLES_CHANGED", { action: "created", teamId, roleId: role.id });
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("[TEAM_ROLES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
