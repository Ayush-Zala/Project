import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/rbac";

/**
 * POST: Ghost Mode Switch (God Switch)
 * Allows Super Admins to manually set their active organization 
 * regardless of membership status.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orgIdStr } = await params;
  const orgId = parseInt(orgIdStr);
  
  if (isNaN(orgId)) {
    return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  // 1. Security Protocol: Verify Super Admin authority
  const isSuperAdmin = await hasPermission(userId, "organisation:read_all");
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: Super Admin Authority Required" }, { status: 403 });
  }

  try {
    // 2. Verify organization exists
    const organization = await (prisma as any).organisation.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 3. Ghost Switch: Manually override the active workspace in the current session
    // We update session record directly, bypassing Better Auth's membership check
    await (prisma as any).session.updateMany({
      where: { userId: userId },
      data: {
        activeOrganizationId: orgId,
        activeTeamId: null 
      }
    });

    // 🛡️ Persistence Protocol: Set Ghost Cookie
    // This cookie ensures the choice survives hard refreshes even if Better Auth resets the session record.
    const cookieStore = await cookies();
    cookieStore.set("ghost_active_org_id", orgId.toString(), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // Valid for 7 days
    });

    console.log(`[GOD-SWITCH] Super Admin ${userId} ghosted into Org ${orgId} (${organization.name}) - Cookie Set`);

    return NextResponse.json({
      success: true,
      message: `Ghosted into ${organization.name}`,
      organization
    });
  } catch (error) {
    console.error("[GOD_SWITCH_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
