import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission } from "@/lib/rbac";

const clientContactSchema = z.object({
  type: z.enum(["MOBILE", "LANDLINE", "WORK_PHONE", "FAX", "EMAIL", "WORK_EMAIL", "WHATSAPP", "TELEGRAM", "SIGNAL", "SKYPE", "ZOOM", "OTHER"]),
  value: z.string().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
});

const clientSocialSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER_X", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK", "GITHUB", "GITLAB", "WEBSITE", "BLOG", "OTHER"]),
  url: z.string().url("Valid URL is required"),
});

const clientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  designation: z.string().optional().nullable(),
  companyId: z.number().positive("Company is required"),
  contacts: z.array(clientContactSchema).optional().default([]),
  socials: z.array(clientSocialSchema).optional().default([]),
});

/**
 * GET: Fetch Client Detail
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const client = await (prisma as any).companyClient.findUnique({
      where: { id: Number(clientId) },
      include: {
        company: true,
        contacts: { where: { isActive: true } },
        socials: { where: { isActive: true } }
      }
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const canRead = await hasPermission(userId, "company_client:read", client.company.organisationId);
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(client);
  } catch (error) {
    console.error("[CLIENT_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update Client
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const existingClient = await (prisma as any).companyClient.findUnique({
      where: { id: Number(clientId) },
      include: { company: true }
    });

    if (!existingClient) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company_client:update", existingClient.company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const result = clientSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

    const { contacts, socials, ...clientData } = result.data;
    const epochNow = BigInt(Date.now());

    const updatedClient = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update basic info
      await tx.companyClient.update({
        where: { id: Number(clientId) },
        data: {
          ...clientData,
          updatedBy: userId,
          updatedAt: epochNow,
        }
      });

      // 2. Sync contacts: Delete and Re-create
      await tx.companyClientContact.deleteMany({ where: { clientId: Number(clientId) } });
      await tx.companyClientContact.createMany({
        data: contacts.map(c => ({
          ...c,
          clientId: Number(clientId),
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
          createdAt: epochNow,
          updatedAt: epochNow,
        }))
      });

      // 3. Sync socials: Delete and Re-create
      await tx.companyClientSocialProfile.deleteMany({ where: { clientId: Number(clientId) } });
      await tx.companyClientSocialProfile.createMany({
        data: socials.map(s => ({
          ...s,
          clientId: Number(clientId),
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
          createdAt: epochNow,
          updatedAt: epochNow,
        }))
      });

      return await tx.companyClient.findUnique({
        where: { id: Number(clientId) },
        include: { contacts: true, socials: true }
      });
    });

    await emitEvent("CLIENTS_CHANGED", { action: "updated", organisationId: existingClient.company.organisationId, clientId });
    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("[CLIENT_PUT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Hard delete Client
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  try {
    const client = await (prisma as any).companyClient.findUnique({
      where: { id: Number(clientId) },
      include: { company: true }
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const allowed = await hasPermission(userId, "company_client:delete", client.company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await (prisma as any).companyClient.delete({
      where: { id: Number(clientId) }
    });

    await emitEvent("CLIENTS_CHANGED", { action: "deleted", organisationId: client.company.organisationId, clientId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLIENT_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
