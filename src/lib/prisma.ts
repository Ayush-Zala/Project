import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = `${process.env["DATABASE_URL"]}`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

// Global type declaration
declare global {
  // Versioned key to force a refresh during development
  var prismaGlobalV3: ReturnType<typeof prismaClientSingleton> | undefined;
}

// Ensure the latest client is used in development
export const prisma = globalThis.prismaGlobalV3 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobalV3 = prisma;