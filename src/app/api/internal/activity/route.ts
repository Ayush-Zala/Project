import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityEvent } from "@prisma/client";

/**
 * 🔒 SECURE INTERNAL LOGGING BRIDGE
 * Allows the Edge-constrained middleware to securely insert high-fidelity 
 * activity logs into the database without direct Prisma runtime access.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, type, description, ipAddress, userAgent } = body;

    if (!userId || !type) {
      return NextResponse.json({ error: "Missing required logging payload" }, { status: 400 });
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: Number(userId),
        eventType: type as ActivityEvent,
        description: description || "",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "unknown",
        eventTime: BigInt(Date.now()),
      },
    });

    return NextResponse.json({ success: true, id: log.id });
  } catch (error) {
    console.error("Internal activity log processing failure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
