import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const organisationUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  logo: z.string().url("Invalid logo URL").optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * GET: Fetch a single organisation by ID (Slug)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "organisation:read", Number(id));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const organisation = await (prisma as any).organisation.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { members: true, teams: true }
        }
      }
    });

    if (!organisation) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(organisation);
  } catch (error) {
    console.error("[ORGANISATION_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update organisation details
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:update", Number(id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = organisationUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const organisation = await (prisma as any).organisation.update({
      where: { id: Number(id) },
      data: {
        name: result.data.name,
        logo: result.data.logo,
        description: result.data.description,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("ORGANISATIONS_CHANGED", { action: "updated", organisationId: id });
    return NextResponse.json(organisation);
  } catch (error) {
    console.error("[ORGANISATION_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove an organisation
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:delete", Number(id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await (prisma as any).organisation.delete({
      where: { id: Number(id) }
    });

    await emitEvent("ORGANISATIONS_CHANGED", { action: "deleted", organisationId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORGANISATION_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
