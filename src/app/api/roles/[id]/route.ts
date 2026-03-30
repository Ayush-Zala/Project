import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/socket-emit";

/**
 * GET: Fetches a single role by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const role = await (prisma as any).role.findUnique({
      where: { id },
      include: {
        parent: { select: { name: true, id: true } }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Updates a role.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description, colorCode, parentId } = body;

    const role = await (prisma as any).role.update({
      where: { id },
      data: {
        name,
        description,
        colorCode,
        parentId: parentId ? parseInt(parentId) : null,
        updatedBy: Number(session.user.id),
      },
      include: {
        parent: {
          select: { name: true }
        }
      }
    });

    // 🔔 Real-time broadcast: update
    await emitEvent("ROLES_CHANGED", { action: "updated", roleId: id })

    return NextResponse.json(role);
  } catch (error) {
    console.error("[ROLE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Permanently removes a role.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await (prisma as any).role.delete({
      where: { id },
    });

    // 🔔 Real-time broadcast: delete
    await emitEvent("ROLES_CHANGED", { action: "deleted", roleId: id })

    return NextResponse.json({ message: "Role deleted permanently" });
  } catch (error) {
    console.error("[ROLE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
