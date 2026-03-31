import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Industrial Seed: Provisioning Simplified RBAC Manifest...");

  const epochNow = BigInt(Date.now());

  // 1. Roles (Single source of truth: Super Admin only)
  const roles = [
    {
      name: "Super Admin",
      slug: "super-admin",
      description: "Highest-level role with complete control over system operations.",
      colorCode: "#DC2626",
    }
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

  // 2. Permission Matrix (Users, Roles, Permissions)
  const resources = ["users", "roles", "permissions"];
  const actions = ["create", "read", "update", "delete", "toggle", "assign_permission", "assign_role"];

  for (const resource of resources) {
    for (const action of actions) {
      // Filter out invalid combinations if any
      if (resource === "permissions" && (action === "assign_permission" || action === "assign_role")) continue;

      const slug = `${resource}:${action}`;
      
      // 🏷️ Human-readable label & description mapping
      let name = "";
      let description = "";
      const actionLabel = action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1, -1); // Singularize (Users -> User)

      if (action === "assign_permission") {
        name = `Assign Permissions to ${resource === "users" ? "User" : "Role"}`;
        description = `Grants the ability to manage granular capability assignments for individual ${resource}.`;
      } else if (action === "assign_role") {
        name = resource === "users" ? "Assign Role to User" : "Manage Role Hierarchy";
        description = `Allows ${resource === "users" ? "binding users to specific security roles" : "configuring parent-child relationships between roles"}.`;
      } else if (action === "toggle") {
        name = `Toggle ${resourceLabel} Status`;
        description = `Provides the capability to suspend or activate ${resource} without deleting data.`;
      } else if (action === "read") {
        name = `View ${resourceLabel} Manifest`;
        description = `Full read-only access to browse and search the ${resource} registry.`;
      } else {
        name = `${actionLabel} ${resourceLabel}`;
        description = `Grants authorization to ${action} ${resource} within the industrial dashboard.`;
      }

      const permission = await prisma.permission.upsert({
        where: { slug },
        update: { name, description },
        create: {
          name,
          slug,
          resource,
          description,
          action,
          isActive: true,
          createdAt: epochNow,
          updatedAt: epochNow,
        },
      });

      // 3. Absolute Authorization: Grant everything to Super Admin
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
    }
  }

  // 4. Boostrap: Auto-elevate first user
  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: firstUser.id, roleId: roleIDs["super-admin"] } },
      update: { isActive: true },
      create: {
        userId: firstUser.id,
        roleId: roleIDs["super-admin"],
        isActive: true,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
    console.log(`BOOTSTRAP: Elevated ${firstUser.email} to Super Admin.`);
  }

  console.log("RBAC Manifest Deployed Successfully.");
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
