import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * PATCH: Toggle Organisation active status
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:toggle", Number(id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const current = await (prisma as any).organisation.findUnique({
        where: { id },
        select: { isActive: true }
    });

    if (!current) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const organisation = await (prisma as any).organisation.update({
      where: { id },
      data: {
        isActive: !current.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("ORGANISATIONS_CHANGED", { action: "toggle", organisationId: id, isActive: organisation.isActive });
    return NextResponse.json(organisation);
  } catch (error) {
    console.error("[ORGANISATION_TOGGLE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
