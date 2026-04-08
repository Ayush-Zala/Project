import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { prismaAuditExtension } from "./prisma-audit-extension";

/**
 * Handle BigInt serialization for JSON responses
 */
if (typeof BigInt !== "undefined") {
  (BigInt.prototype as any).toJSON = function () {
    const num = Number(this);
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      return this.toString();
    }
    return num;
  };
}

const connectionString = `${process.env["DATABASE_URL"]}`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

/**
 * Helper to recursively convert Date objects to BigInt timestamps
 */
function convertToBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return BigInt(obj.getTime());
  if (typeof obj === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) {
      const timestamp = Date.parse(obj.includes(" ") ? obj.replace(" ", "T") : obj);
      if (!isNaN(timestamp)) return BigInt(timestamp);
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(convertToBigInt);
  if (typeof obj === "object" && obj !== null) {
    const res: any = {};
    for (const key in obj) res[key] = convertToBigInt(obj[key]);
    return res;
  }
  return obj;
}

/**
 * Outbound: Recursively convert BigInt to Number for Application
 */
function convertToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertToNumber);
  if (typeof obj === "object" && obj !== null) {
    const res: any = {};
    for (const key in obj) res[key] = convertToNumber(obj[key]);
    return res;
  }
  return obj;
}

/**
 * Inbound: Coerce numeric-as-string ID fields to actual Numbers
 * Target identifiers from Better Auth that should be Int in Postgres
 */
const NUMERIC_ID_KEYS = new Set([
  "userId", "id", "organizationId", "activeOrganizationId", "activeTeamId",
  "teamId", "roleId", "permissionId", "inviterId", "memberId", "teamRoleId", "teamMemberId"
]);

function coerceNumericFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(coerceNumericFields);
  if (typeof obj === "object" && obj !== null) {
    const res: any = {};
    for (const key in obj) {
      let val = obj[key];
      // If it's a known numeric key and it's a string, cast it
      if (NUMERIC_ID_KEYS.has(key) && typeof val === "string") {
        const num = Number(val);
        if (!isNaN(num)) val = num;
      } 
      // Handle nested update operations like { set: "1" } or { connect: { id: "1" } }
      else if (typeof val === "object" && val !== null) {
        val = coerceNumericFields(val);
        
        // Extra safety: if the parent key is in the set, and child is { set: "string" }, cast it
        if (NUMERIC_ID_KEYS.has(key) && val && typeof val.set === "string") {
          const num = Number(val.set);
          if (!isNaN(num)) val.set = num;
        }
      }
      res[key] = val;
    }
    return res;
  }
  return obj;
}

const prismaClientSingleton = () => {
  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends(prismaAuditExtension).$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }: any) {
          if (args.data) args.data = coerceNumericFields(convertToBigInt(args.data));
          if (args.where) args.where = coerceNumericFields(convertToBigInt(args.where));

          return convertToNumber(await query(args));
        },
      } as any,
    },
    // Redundant layer for extra safety on specific field access
    result: {
      $allModels: {
        createdAt: { needs: { createdAt: true }, compute(d: any) { return d.createdAt ? Number(d.createdAt) : d.createdAt; } },
        updatedAt: { needs: { updatedAt: true }, compute(d: any) { return d.updatedAt ? Number(d.updatedAt) : d.updatedAt; } },
        expiresAt: { needs: { expiresAt: true }, compute(d: any) { return d.expiresAt ? Number(d.expiresAt) : d.expiresAt; } },
        emailVerifiedAt: { needs: { emailVerifiedAt: true }, compute(d: any) { return d.emailVerifiedAt ? Number(d.emailVerifiedAt) : d.emailVerifiedAt; } },
        accessTokenExpiresAt: { needs: { accessTokenExpiresAt: true }, compute(d: any) { return d.accessTokenExpiresAt ? Number(d.accessTokenExpiresAt) : d.accessTokenExpiresAt; } },
        refreshTokenExpiresAt: { needs: { refreshTokenExpiresAt: true }, compute(d: any) { return d.refreshTokenExpiresAt ? Number(d.refreshTokenExpiresAt) : d.refreshTokenExpiresAt; } },
        lastActive: { needs: { lastActive: true }, compute(d: any) { return d.lastActive ? Number(d.lastActive) : d.lastActive; } },
        eventTime: { needs: { eventTime: true }, compute(d: any) { return d.eventTime ? Number(d.eventTime) : d.eventTime; } },
      } as any,
    },
  });
};

// Global type declaration
declare global {
  var prismaGlobalV18: ReturnType<typeof prismaClientSingleton> | undefined;
}

// Ensure the latest client is used in development
export const prisma = globalThis.prismaGlobalV18 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobalV18 = prisma;