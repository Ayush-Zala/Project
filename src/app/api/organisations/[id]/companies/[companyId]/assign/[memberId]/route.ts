import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

/**
 * DELETE: Remove a specific member assignment from a company
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; companyId: string; memberId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId, companyId, memberId } = await params;
  const userId = Number(session.user.id);

  const allowed = await hasPermission(userId, "company:assign", Number(orgId));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await (prisma as any).companyMember.delete({
      where: {
        companyId_organizationMemberId: {
          companyId: Number(companyId),
          organizationMemberId: Number(memberId)
        }
      }
    });

    await emitEvent("COMPANIES_CHANGED", { action: "unassigned", organisationId: orgId, companyId, memberId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COMPANY_UNASSIGN_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
