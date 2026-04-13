import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  otherType: z.string().optional(),
  value: z.string().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
}).refine(data => data.type !== "OTHER" || (data.otherType && data.otherType.length > 0), {
  message: "Specific contact type is required for 'OTHER'",
  path: ["otherType"]
});

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  otherPlatform: z.string().optional(),
  url: z.string().url("Valid URL is required"),
}).refine(data => data.platform !== "OTHER" || (data.otherPlatform && data.otherPlatform.length > 0), {
  message: "Specific platform name is required for 'OTHER'",
  path: ["otherPlatform"]
});

const clientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  designation: z.string().optional().nullable(),
  contacts: z.array(clientContactSchema).optional().default([]),
  socials: z.array(clientSocialSchema).optional().default([]),
});

/**
 * GET: List Clients for a specific Company
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      select: { organisationId: true }
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const canRead = await hasPermission(userId, "company_client:read", company.organisationId);
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clients = await (prisma as any).companyClient.findMany({
      where: { companyId: Number(companyId) },
      include: {
        contacts: { where: { isActive: true } },
        socials: { where: { isActive: true } }
      },
      orderBy: { fullName: 'asc' }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("[COMPANY_CLIENTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a Client for a Company
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: Number(companyId) },
      select: { organisationId: true }
    });

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company_client:create", company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const result = clientSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { contacts, socials, ...clientData } = result.data;
    const epochNow = BigInt(Date.now());

    const client = await (prisma as any).companyClient.create({
      data: {
        ...clientData,
        companyId: Number(companyId),
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
        createdAt: epochNow,
        updatedAt: epochNow,
        contacts: {
          create: contacts.map(c => ({
            ...c,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }))
        },
        socials: {
          create: socials.map(s => ({
            ...s,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }))
        }
      },
      include: {
        contacts: true,
        socials: true
      }
    });

    await emitEvent("CLIENTS_CHANGED", { action: "created", organisationId: company.organisationId, companyId, clientId: String(client.id) });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[COMPANY_CLIENTS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
