import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 🛡️ INDUSTRIAL AUDIT CONTEXT
 * Uses AsyncLocalStorage to track the 'Who', 'Where', and 'Why' of a database mutation
 * global across a single request execution thread.
 */
export interface AuditContext {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  reason?: string; // Optional context-specific reason
}

// Global storage singleton
export const auditStorage = new AsyncLocalStorage<AuditContext>();

/**
 * Retrieve the current audit context from the storage.
 */
export function getAuditContext(): AuditContext | undefined {
  return auditStorage.getStore();
}

/**
 * Execute a function within a specific audit context.
 * Essential for wrapping API routes and Server Actions.
 */
export function runWithAuditContext<T>(context: AuditContext, fn: () => T | Promise<T>): T | Promise<T> {
  return auditStorage.run(context, fn);
}

/**
 * Helper to update the current context (e.g., adding a reason after initial set)
 */
export function setAuditReason(reason: string) {
  const context = auditStorage.getStore();
  if (context) {
    context.reason = reason;
  }
}
