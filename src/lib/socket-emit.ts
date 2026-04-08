/**
 * socket-emit.ts
 * ─────────────────────────────────────────────────────────────
 * Utility used by Next.js API routes to notify the WebSocket
 * gateway of data changes.  We connect as a one-shot client
 * (using socket.io-client) so that the Next.js API routes
 * themselves don't need to maintain a long-lived connection.
 *
 * The gateway then broadcasts the event to every dashboard user.
 * ─────────────────────────────────────────────────────────────
 */

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:3001";

/**
 * Supported real-time event names.
 * Keep these in sync with the event names consumed in the
 * React SocketProvider / page-level listeners.
 */
export type RealtimeEvent =
  | "ROLES_CHANGED"          // Role mutation
  | "USERS_CHANGED"          // User profile / status / password
  | "PERMISSIONS_CHANGED"    // Permission definition mutation
  | "ROLE_PERMISSIONS_CHANGED" // Mapping permissions to roles
  | "USER_PERMISSIONS_CHANGED" // Mapping permissions to users
  | "TEAMS_CHANGED"          // Team creation / toggle / metadata
  | "TEAM_ROLES_CHANGED"      // Team Role creation / toggle
  | "TEAM_MEMBERS_CHANGED"    // Team Member assignment / toggle / role_assigned
  | "ORGANISATIONS_CHANGED"         // Organisation CRUD
  | "ORGANISATION_MEMBERS_CHANGED" // Member CRUD
  | "ORGANISATION_TEAM_MEMBERS_CHANGED" // Team Member CRUD
  | "ORGANISATION_TEAMS_CHANGED"; // Team CRUD

/**
 * Emits a one-shot event to the WebSocket gateway server.
 * Safe to call from any Next.js API route — it fires and does
 * NOT block the response back to the browser.
 */
export async function emitEvent(
  event: RealtimeEvent,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    // Use the socket.io-client HTTP polling fallback endpoint to
    // trigger an internal push from API → WS server.
    // We use a lightweight "fire and forget" HTTP POST to a
    // dedicated /internal/emit route on the WS server.
    const body = JSON.stringify({ event, payload });
    await fetch(`${WS_SERVER_URL}/internal/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    // Non-fatal: real-time sync failing should never break the API response.
    console.warn(`[WS_EMIT] Could not notify WebSocket server for event: ${event}`);
  }
}
