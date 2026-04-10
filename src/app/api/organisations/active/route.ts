import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET: Ghost Resolver API
 * Resolves the currently "active" organization from the session database or Ghost Cookie.
 * This is used as a fallback for Super Admins who are ghosting 
 * into organizations they haven't formally joined.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    console.log("[ACTIVE_ORG_GET] No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🛡️ Persistence Protocol: Priority Resolution
  // 1. Better Auth Session (Standard Resolve) - WINS if present
  // 2. Ghost Cookie (Master Override for Super Admins) - FALLBACK if BA rejects/clears org
  // 3. Database Session (Manual Result of God Switch) - SAFETY FALLBACK
  
  const cookieStore = await cookies();
  const ghostOrgId = cookieStore.get("ghost_active_org_id")?.value;
  const baOrgId = session.session?.activeOrganizationId;
  
  // Logic: Logic: If Better Auth has a valid activeOrganizationId, it means a standard 
  // switch (Sidebar/Better Auth) just occurred. We prioritize the live session 
  // and clear any stale "Ghost" cookies to allow seamless switching.
  let activeOrgId = baOrgId;

  if (activeOrgId) {
      if (ghostOrgId && String(ghostOrgId) !== String(activeOrgId)) {
          console.log(`[ACTIVE_ORG_GET] Standard Switch Detected: Clearing stale Ghost Cookie ${ghostOrgId} in favor of ${activeOrgId}`);
          cookieStore.delete("ghost_active_org_id");
      }
  } else {
      // If Better Auth is null, we check the Ghost persistence layers
      activeOrgId = ghostOrgId;

      if (!activeOrgId) {
          const dbSession = await (prisma as any).session.findFirst({
              where: { userId: Number(session.user.id) },
              orderBy: { expiresAt: 'desc' },
              select: { activeOrganizationId: true }
          });
          activeOrgId = dbSession?.activeOrganizationId;
      }
  }

  console.log(`[ACTIVE_ORG_GET] User: ${session.user.id}, BA: ${baOrgId}, Ghost: ${ghostOrgId}, Resolved: ${activeOrgId}`);

  if (!activeOrgId) {
    return NextResponse.json({ activeOrg: null });
  }

  try {
    const organisation = await (prisma as any).organisation.findUnique({
      where: { id: Number(activeOrgId) },
      include: {
        _count: {
          select: { members: true, teams: true }
        }
      }
    });

    if (!organisation) {
      if (ghostOrgId) cookieStore.delete("ghost_active_org_id");
      return NextResponse.json({ activeOrg: null });
    }

    // Check if the user is a formal member
    const membership = await (prisma as any).organisationMember.findFirst({
        where: {
            userId: Number(session.user.id),
            organizationId: Number(activeOrgId)
        }
    });

    return NextResponse.json({
      activeOrg: {
        ...organisation,
        isExternal: !membership, // Mark as external if no membership record exists
        ghostRole: membership ? membership.role : "super-admin"
      }
    });
  } catch (error) {
    console.error("[ACTIVE_ORG_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
