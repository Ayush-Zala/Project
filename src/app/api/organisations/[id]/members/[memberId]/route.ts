import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";
import { validateRoleTransition } from "@/lib/security-rules";

const memberUpdateSchema = z.object({
  role: z.enum(["owner", "member"]).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH: Update member details In Organisation
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, memberId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = resolvedParams.id;
  const memberId = parseInt(resolvedParams.memberId);

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:member:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = memberUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    // 🛡️ Security Protocol: Validate role immutability
    if (result.data.role) {
      const currentMember = await (prisma as any).organisationMember.findUnique({
        where: { id: memberId },
        select: { role: true }
      });

      if (currentMember) {
        try {
          validateRoleTransition(currentMember.role, result.data.role);
        } catch (ve: any) {
          return NextResponse.json({ error: ve.message }, { status: 403 });
        }
      }
    }

    const member = await (prisma as any).organisationMember.update({
      where: { id: memberId },
      data: {
        ...result.data,
        updatedBy: userId,
        updatedAt: BigInt(Date.now()),
      }
    });

    await emitEvent("ORGANISATION_MEMBERS_CHANGED", { action: "updated", organisationId: orgId, memberId: String(memberId) });
    return NextResponse.json(member);
  } catch (error) {
    console.error("[MEMBER_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove a member from an Organisation
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, memberId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const orgId = resolvedParams.id;
  const memberId = parseInt(resolvedParams.memberId);

  const userId = Number(session.user.id);
  const allowed = await hasPermission(userId, "organisation:member:manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await (prisma as any).organisationMember.delete({
      where: { id: memberId }
    });

    await emitEvent("ORGANISATION_MEMBERS_CHANGED", { action: "removed", organisationId: orgId, memberId: String(memberId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MEMBER_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
