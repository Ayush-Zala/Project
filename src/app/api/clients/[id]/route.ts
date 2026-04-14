import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import * as z from "zod";
import { hasPermission, checkIsOrgOwner } from "@/lib/rbac";

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

    const canReadAll = await hasPermission(userId, "company_client:read_all", client.company.organisationId);
    const isOwner = await checkIsOrgOwner(userId, client.company.organisationId);
    const isAuthor = client.createdBy === userId;

    if (!canReadAll && !isOwner && !isAuthor) {
      return NextResponse.json({ error: "Access Denied: You do not have permission to view this record" }, { status: 403 });
    }

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

    // 🛡️ Deep Comparison Helper
    const isSame = (oldObj: any, newObj: any, fields: string[]) => {
      if (!oldObj) return false;
      return fields.every(f => oldObj[f] === newObj[f]);
    };

    const updatedClient = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update basic info ONLY if changed
      if (!isSame(existingClient, clientData, ["fullName", "designation"])) {
        await tx.companyClient.update({
          where: { id: Number(clientId) },
          data: {
            ...clientData,
            updatedBy: userId,
            updatedAt: epochNow,
          }
        });
      }

      // 2. Smart Sync Contacts
      const incomingContactIds = contacts.map((c: any) => c.id).filter(Boolean) as number[];
      const existingContactIds = existingClient.contacts.map((c: any) => c.id);

      const contactsToDelete = existingContactIds.filter((id: number) => !incomingContactIds.includes(id));
      if (contactsToDelete.length > 0) {
        await tx.companyClientContact.deleteMany({
          where: { id: { in: contactsToDelete } }
        });
      }

      for (const contact of contacts as any[]) {
        const { id, ...cData } = contact;
        const existing = existingClient.contacts.find((c: any) => c.id === id);
        if (existing && isSame(existing, cData, ["type", "otherType", "value", "isPrimary"])) continue;

        await tx.companyClientContact.upsert({
          where: { id: id || -1 },
          update: { ...cData, updatedBy: userId, updatedAt: epochNow },
          create: {
            ...cData,
            clientId: Number(clientId),
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }
        });
      }

      // 3. Smart Sync Socials
      const incomingSocialIds = socials.map((s: any) => s.id).filter(Boolean) as number[];
      const existingSocialIds = existingClient.socials.map((s: any) => s.id);

      const socialsToDelete = existingSocialIds.filter((id: number) => !incomingSocialIds.includes(id));
      if (socialsToDelete.length > 0) {
        await tx.companyClientSocialProfile.deleteMany({
          where: { id: { in: socialsToDelete } }
        });
      }

      for (const social of socials as any[]) {
        const { id, ...sData } = social;
        const existing = existingClient.socials.find((s: any) => s.id === id);
        if (existing && isSame(existing, sData, ["platform", "otherPlatform", "url"])) continue;

        await tx.companyClientSocialProfile.upsert({
          where: { id: id || -1 },
          update: { ...sData, updatedBy: userId, updatedAt: epochNow },
          create: {
            ...sData,
            clientId: Number(clientId),
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: epochNow,
            updatedAt: epochNow,
          }
        });
      }

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
