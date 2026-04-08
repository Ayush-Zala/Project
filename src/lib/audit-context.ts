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
  action?: string; // Optional action override (e.g. Toggle)
  skipAudit?: boolean; // 🔒 INTERNAL: Suppress automatic model-level logging
}

// 🛡️ HMR-SAFE GLOBAL SINGLETON
// In development, Next.js reloads modules frequently. 
// We must ensure the 'auditStorage' instance persists to keep context alive across reloads.
declare global {
  var auditStorageSingleton: AsyncLocalStorage<AuditContext> | undefined;
}

export const auditStorage = globalThis.auditStorageSingleton ?? new AsyncLocalStorage<AuditContext>();

if (process.env.NODE_ENV !== "production") {
  globalThis.auditStorageSingleton = auditStorage;
}

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

/**
 * Helper to update the current action intent
 */
export function setAuditAction(action: string) {
  const context = auditStorage.getStore();
  if (context) {
    context.action = action;
  }
}

/**
 * Programmatically suppress all automatic model-level auditing for the current context.
 * Used for consolidated, manual auditing in complex transactions.
 */
export function setAuditSuppression(skip: boolean) {
  const context = auditStorage.getStore();
  if (context) {
    context.skipAudit = skip;
  }
}
