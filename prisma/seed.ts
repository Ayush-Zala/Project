import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Industrial Seed: Provisioning Core System Assets...");

  const epochNow = BigInt(Date.now());

  // 1. Roles
  const roles = [
    {
      name: "Super Admin",
      slug: "super-admin",
      description: "Highest-level role with complete control over system operations.",
      colorCode: "#DC2626",
    },
    {
      name: "Admin",
      slug: "admin",
      description: "System administration with limited sensitive access.",
      colorCode: "#2563EB",
    },
    {
      name: "Manager",
      slug: "manager",
      description: "Operational management within specific departments.",
      colorCode: "#059669",
    },
  ];

  const roleIDs: Record<string, number> = {};

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        ...r,
        isActive: true,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
    roleIDs[r.slug] = role.id;
  }

  // 2. Permissions
  const resources = ["users", "roles", "permissions"];
  const actions = ["create", "read", "update", "delete", "toggle", "assign_permission", "assign_role"];

  for (const resource of resources) {
    for (const action of actions) {
      if (resource === "permissions" && (action === "assign_permission" || action === "assign_role")) continue;

      const slug = `${resource}:${action}`;
      const name = `${action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${resource}`;
      
      const permission = await prisma.permission.upsert({
        where: { slug },
        update: { name }, // Ensure name is pretty
        create: {
          name,
          slug,
          resource,
          action,
          isActive: true,
          createdAt: epochNow,
          updatedAt: epochNow,
        },
      });

      // 3. Assign to Roles (Super Admin gets all)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleIDs["super-admin"], permissionId: permission.id } },
        update: {},
        create: {
          roleId: roleIDs["super-admin"],
          permissionId: permission.id,
          isActive: true,
          createdAt: epochNow,
          updatedAt: epochNow,
        },
      });

      // 4. Admin Permissions (Most except permissions management and roles:delete)
      if (resource !== "permissions" && !(resource === "roles" && action === "delete")) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: roleIDs["admin"], permissionId: permission.id } },
            update: {},
            create: {
              roleId: roleIDs["admin"],
              permissionId: permission.id,
              isActive: true,
              createdAt: epochNow,
              updatedAt: epochNow,
            },
          });
      }

      // 5. Manager Permissions (Read-only + simple user updates)
      if (action === "read" || (resource === "users" && (action === "update" || action === "toggle"))) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: roleIDs["manager"], permissionId: permission.id } },
            update: {},
            create: {
              roleId: roleIDs["manager"],
              permissionId: permission.id,
              isActive: true,
              createdAt: epochNow,
              updatedAt: epochNow,
            },
          });
      }
    }
  }

  console.log("Super Admin Manifested & Permissions Primed.");
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
