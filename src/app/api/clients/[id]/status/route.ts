import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";
import { hasPermission } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const allowed = await hasPermission(userId, "company_client:toggle", client.company.organisationId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updatedClient = await (prisma as any).companyClient.update({
      where: { id: Number(clientId) },
      data: {
        isActive: !client.isActive,
        updatedBy: userId,
        updatedAt: BigInt(Date.now())
      }
    });

    await emitEvent("CLIENTS_CHANGED", { action: "toggled", organisationId: client.company.organisationId, clientId });
    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("[CLIENT_TOGGLE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
