import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Industrial Seed: Provisioning Super Admin Role...");

  const epochNow = BigInt(Date.now());

  const superAdmin = await prisma.role.upsert({
    where: { slug: "super-admin" },
    update: {}, // Do nothing if it already exists
    create: {
      name: "Super Admin",
      slug: "super-admin",
      description: "Highest-level role with complete control over system operations, including user management, role assignment, permissions, and configuration.",
      colorCode: "#DC2626",
      isActive: true,
      createdBy: null,
      updatedBy: null,
      parentId: null,
      createdAt: epochNow,
      updatedAt: epochNow,
    },
  });

  console.log("Super Admin Role Manifested:", (superAdmin as any).name);
  console.log("Seeding Protocol Complete.");
}

main()
  .catch((e) => {
    console.error("Seeding Protocol Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
