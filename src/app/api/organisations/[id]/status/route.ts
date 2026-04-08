import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { runWithAuditContext } from "@/lib/audit-context";

const statusUpdateSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH: Toggle organisation operational status
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:update");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = statusUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    // 🛡️ Note: System-wide numeric coercion in prisma.ts handles the 'id' casting automatically.
    const organisation = await runWithAuditContext({ userId }, () => (prisma as any).organisation.update({
      where: { id },
      data: {
        isActive: result.data.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    }));

    await emitEvent("ORGANISATIONS_CHANGED", { action: "updated", organisationId: id });
    return NextResponse.json(organisation);
  } catch (error) {
    console.error("[ORGANISATION_STATUS_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
