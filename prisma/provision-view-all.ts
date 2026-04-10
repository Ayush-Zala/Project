import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🛡️ Provisioning System-Wide Visibility Permissions...");

  const epochNow = BigInt(Date.now());

  // 1. Ensure permissions exist
  const permissionsToGrant = [
    { slug: "organisation:read_all", name: "View All Organisations", resource: "Organisation", action: "read_all" },
    { slug: "organisation_member:read_all", name: "View All Org Members", resource: "Organisation Members", action: "read_all" },
    { slug: "organisation_team:read_all", name: "View All Org Teams", resource: "Organisation Teams", action: "read_all" },
  ];

  const permissionIds: number[] = [];

  for (const p of permissionsToGrant) {
    const perm = await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { isActive: true },
      create: {
        ...p,
        isActive: true,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
    permissionIds.push(perm.id);
    console.log(`✅ Permission verified: ${p.slug}`);
  }

  // 2. Find Super Admin role
  const superAdminRole = await prisma.role.findUnique({
    where: { slug: "super-admin" },
  });

  if (!superAdminRole) {
    console.error("❌ Super Admin role not found. Please run seed first.");
    return;
  }

  // 3. Grant permissions to Super Admin
  for (const pId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { 
        roleId_permissionId: { 
          roleId: superAdminRole.id, 
          permissionId: pId 
        } 
      },
      update: { isActive: true },
      create: {
        roleId: superAdminRole.id,
        permissionId: pId,
        isActive: true,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
  }

  console.log("🚀 All system-wide visibility permissions granted to Super Admin.");
}

main()
  .catch((e) => {
    console.error("Provisioning failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
