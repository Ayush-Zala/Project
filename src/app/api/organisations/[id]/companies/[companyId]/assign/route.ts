import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const assignSchema = z.object({
  memberIds: z.array(z.number()),
});

/**
 * GET: List all assigned members for a company
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; companyId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId, companyId } = await params;
  const userId = Number(session.user.id);

  // Check if user can assign or read company (assignment list visibility)
  const canAssign = await hasPermission(userId, "company:assign", Number(orgId));
  const canRead = await hasPermission(userId, "company:read", Number(orgId));
  
  if (!canAssign && !canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const assignments = await (prisma as any).companyMember.findMany({
      where: { companyId: Number(companyId) },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("[COMPANY_ASSIGNMENTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Synchronize member assignments for a company
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; companyId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId, companyId } = await params;
  const userId = Number(session.user.id);

  const allowed = await hasPermission(userId, "company:assign", Number(orgId));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = assignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { memberIds } = result.data;
    const epochNow = BigInt(Date.now());

    // 1. Verify all memberIds belong to the organization
    const validMembers = await (prisma as any).organisationMember.findMany({
      where: {
        id: { in: memberIds },
        organizationId: Number(orgId)
      },
      select: { id: true, userId: true }
    });

    const validIds = validMembers.map((m: any) => m.id);
    
    // 2. Transactional Solo-Company Assignment
    // We execute in sequence to ensure each member is assigned to the target company.
    // Because organizationMemberId is UNIQUE, upserting will automatically "steal" the member from any old company.
    await (prisma as any).$transaction(async (tx: any) => {
        // Step A: Remove anyone currently in THIS company who is NOT in the new list
        await tx.companyMember.deleteMany({
            where: {
                companyId: Number(companyId),
                organizationMemberId: { notIn: validIds }
            }
        });

        // Step B: Upsert new assignments
        for (const mId of validIds) {
            await tx.companyMember.upsert({
                where: { organizationMemberId: mId },
                update: { 
                   companyId: Number(companyId), // Re-assign to THIS company if assigned elsewhere
                   isActive: true, 
                   updatedBy: userId, 
                   updatedAt: epochNow 
                },
                create: {
                    companyId: Number(companyId),
                    organizationMemberId: mId,
                    isActive: true,
                    createdBy: userId,
                    updatedBy: userId,
                    createdAt: epochNow,
                    updatedAt: epochNow
                }
            });
        }
    });

    await emitEvent("COMPANIES_CHANGED", { action: "assignments_synced", organisationId: orgId, companyId });

    return NextResponse.json({ success: true, assignedCount: validIds.length });
  } catch (error) {
    console.error("[COMPANY_ASSIGN_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

