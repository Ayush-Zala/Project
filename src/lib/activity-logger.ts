import { prisma } from "./prisma"
import { ActivityEvent } from "@prisma/client"
import { headers } from "next/headers"

interface ActivityConfig {
  userId: number
  type: ActivityEvent
  description?: string
  req?: Request // Optional: to extract headers if available
}

/**
 * Common entry point for industrial-grade activity logging.
 * Captures IP and User-Agent automatically from headers.
 */
export async function createActivityEntry({
  userId,
  type,
  description,
}: ActivityConfig) {
  try {
    const headerList = await headers()
    const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
    const userAgent = headerList.get("user-agent") || "unknown"

    console.log(`[ACTIVITY_LOGGER] Creating log: User #${userId} | Event: ${type} | IP: ${ipAddress}`);
    
    const log = await prisma.activityLog.create({
      data: {
        userId: Number(userId),
        eventType: type,
        description,
        ipAddress,
        userAgent,
        eventTime: BigInt(Date.now()),
      },
    })

    console.log(`[ACTIVITY_LOGGER] Successfully created log ID: ${log.id}`);
    return log;
  } catch (error) {
    console.error("[ACTIVITY_LOGGER_FATAL] Failed to create activity log entry:", error)
    // We don't throw here to avoid breaking the main application flow
    return null
  }
}
