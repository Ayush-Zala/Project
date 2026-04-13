import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasPermission, checkIsOrgOwner } from "@/lib/rbac";
import { getPrismaWhere, getPrismaOrderBy } from "@/lib/data-table-server";
import { type ExtendedColumnFilter } from "@/types/data-table";

/**
 * GET: List all Clients in an Organisation
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organisationId } = await params;
  const { searchParams } = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const canRead = await hasPermission(userId, "company_client:read", Number(organisationId));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("per_page") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "";
  const filtersRaw = searchParams.get("filters") || "[]";
  
  let filters: ExtendedColumnFilter[] = [];
  try {
    filters = JSON.parse(filtersRaw);
  } catch (e) {
    console.warn("Invalid filters ignored");
  }

  const skip = (page - 1) * limit;

  try {
    const searchWhere = search
      ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { designation: { contains: search, mode: "insensitive" as const } },
          { company: { name: { contains: search, mode: "insensitive" as const } } }
        ]
      }
      : {};

    const advancedWhere = getPrismaWhere(filters);
    
    const canReadAll = await hasPermission(userId, "company_client:read_all", Number(organisationId));
    const isOwner = await checkIsOrgOwner(userId, Number(organisationId));
    
    const where = {
      AND: [
        { company: { organisationId: Number(organisationId) } },
        searchWhere,
        advancedWhere,
        ...(!(canReadAll || isOwner) ? [{ createdBy: userId }] : []),
      ]
    };

    const orderBy = getPrismaOrderBy(sort) || { createdAt: 'desc' };

    const [total, clients] = await Promise.all([
      (prisma as any).companyClient.count({ where }),
      (prisma as any).companyClient.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: {
            select: { id: true, name: true }
          },
          contacts: {
            where: { isActive: true }
          },
          socials: {
            where: { isActive: true }
          }
        }
      }),
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ORGANISATION_CLIENTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
