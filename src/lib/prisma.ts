import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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
/**
 * Inbound: Recursively convert Dates to BigInt for Database
 */
function convertToBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return BigInt(obj.getTime());
  if (typeof obj === "string") {
    // Standard Date/DateTime format check
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) {
      const timestamp = Date.parse(obj.includes(" ") ? obj.replace(" ", "T") : obj);
      if (!isNaN(timestamp)) return BigInt(timestamp);
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(convertToBigInt);
  if (typeof obj === "object" && obj.constructor === Object) {
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
  if (typeof obj === "object" && obj.constructor === Object) {
    const res: any = {};
    for (const key in obj) res[key] = convertToNumber(obj[key]);
    return res;
  }
  return obj;
}

const prismaClientSingleton = () => {
  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }: any) {
          // Process Inputs
          if (args.data) args.data = convertToBigInt(args.data);
          if (args.where) args.where = convertToBigInt(args.where);
          
          // Execute and Process Results
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
  // Use a new key (V4) to force a refresh during dev hot-reloads
  var prismaGlobalV4: ReturnType<typeof prismaClientSingleton> | undefined;
}

// Ensure the latest client is used in development
export const prisma = globalThis.prismaGlobalV4 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobalV4 = prisma;