import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const assignSchema = z.object({
  companyIds: z.array(z.number()),
  memberId: z.number(),
});

/**
 * GET: List assigned member for a single company
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await params;
  const userId = Number(session.user.id);

  const canRead = await hasPermission(userId, "company:read", Number(orgId));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
 * POST: Assign/Bulk Assign a member to one or more companies
 * Includes SWAP logic: If a company is already assigned, its owner entry is updated.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orgId } = await params;
  const userId = Number(session.user.id);

  const allowed = await hasPermission(userId, "company:assign", Number(orgId));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = assignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid data provided" }, { status: 400 });

    const { companyIds, memberId } = result.data;
    const epochNow = BigInt(Date.now());

    // 1. Verify member belongs to the organization
    const member = await (prisma as any).organisationMember.findUnique({
      where: {
        id: memberId,
        organizationId: Number(orgId)
      }
    });

    if (!member) return NextResponse.json({ error: "Member not found in organization" }, { status: 404 });
    
    // 2. Transact assignments with Swap Logic
    await (prisma as any).$transaction(async (tx: any) => {
        for (const cId of companyIds) {
            await tx.companyMember.upsert({
                where: { companyId: cId },
                update: { 
                   organizationMemberId: memberId, // SWAP: Update existing company owner
                   isActive: true, 
                   updatedBy: userId, 
                   updatedAt: epochNow 
                },
                create: {
                    companyId: cId,
                    organizationMemberId: memberId,
                    isActive: true,
                    createdBy: userId,
                    updatedBy: userId,
                    createdAt: epochNow,
                    updatedAt: epochNow
                }
            });
        }
    });

    for (const cId of companyIds) {
        await emitEvent("COMPANIES_CHANGED", { action: "assignments_synced", organisationId: orgId, companyId: cId });
    }

    return NextResponse.json({ success: true, count: companyIds.length });
  } catch (error) {
    console.error("[COMPANY_ASSIGN_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
