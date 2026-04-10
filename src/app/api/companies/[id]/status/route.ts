import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      select: { organisationId: true, isActive: true }
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company:toggle", company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updatedCompany = await (prisma as any).company.update({
      where: { id: Number(companyId) },
      data: {
        isActive: !company.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now())
      }
    });

    await emitEvent("COMPANIES_CHANGED", { action: "toggled", organisationId: company.organisationId, companyId });
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("[COMPANY_TOGGLE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
