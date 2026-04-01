import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

/**
 * 🛠️ ABSOLUTE FUNCTIONAL MANIFEST
 * ─────────────────────────────────────────────────────────────
 * Only permissions listed here will exist in the final registry.
 * All other "automated" or "orphaned" capabilities will be purged.
 */
const PERMISSIONS_MANIFEST: Record<string, string[]> = {
  users: ["create", "read", "update", "delete", "toggle", "assign_role", "assign_permission"],
  roles: ["create", "read", "update", "delete", "toggle", "assign_permission"],
  permissions: ["create", "read", "update", "delete", "toggle"],
  teams: ["create", "read", "read_all", "update", "delete", "toggle"],
  team_roles: ["create", "read", "update", "delete", "toggle"],
  team_members: ["create", "read", "update", "delete", "toggle", "assign_role"],
};

async function main() {
  console.log("Industrial Seed: Executing Absolute Registry Cleanup...");

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

  // 2. Identification of Valid Slugs
  const validPermissionSlugs: string[] = [];
  for (const [resource, actions] of Object.entries(PERMISSIONS_MANIFEST)) {
    for (const action of actions) {
      validPermissionSlugs.push(`${resource}:${action}`);
    }
  }

  // 3. Absolute Cleanup: Purge Orphaned Permissions
  const orphanedCount = await prisma.permission.deleteMany({
    where: {
      slug: { notIn: validPermissionSlugs }
    }
  });
  if (orphanedCount.count > 0) {
    console.log(`CLEANUP: Purged ${orphanedCount.count} redundant/inactive capabilities from the registry.`);
  }

  // 4. Provision Functional Manifest
  console.log("PROVISIONING: Syncing functional security policies...");
  for (const [resource, actions] of Object.entries(PERMISSIONS_MANIFEST)) {
    for (const action of actions) {
      const slug = `${resource}:${action}`;
      
      // 🏷️ Human-readable labeling logic
      let name = "";
      let description = "";
      const actionLabel = action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      // Improved singularization for multi-word resources
      const resourceLabel = resource
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).replace(/s$/, '')) // Capitalize + Strip trailing 's'
        .join(' ');

      if (action === "assign_permission") {
        name = `Assign Permissions to ${resourceLabel}`;
        description = `Grants the ability to manage granular capability assignments for individual ${resource}.`;
      } else if (action === "assign_role") {
        name = resource === "users" ? "Assign Role to User" : `Manage ${resourceLabel} Roles`;
        description = `Provides the capability to bind users to specific security roles or manage localized hierarchies.`;
      } else if (action === "toggle") {
        name = `Toggle ${resourceLabel} Status`;
        description = `Provides the capability to suspend or activate ${resource} without deleting data.`;
      } else if (action === "read") {
        name = `View ${resourceLabel} Manifest`;
        description = `Full read-only access to browse and search the ${resource} registry.`;
      } else if (action === "read_all") {
        name = `View All ${resourceLabel} Segments`;
        description = `Global visibility across all organizational segments, bypassing decentralized isolation.`;
      } else {
        name = `${actionLabel} ${resourceLabel}`;
        description = `Grants authorization to ${action} ${resource} within the industrial dashboard.`;
      }

      const permission = await prisma.permission.upsert({
        where: { slug },
        update: { name, description, isActive: true },
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

      // 5. Authorization: Re-sync Super Admin
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleIDs["super-admin"], permissionId: permission.id } },
        update: { isActive: true },
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

  // 6. Bootstrap: Ensure root administrator is elevated
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true }
  });
  if (adminUser) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: roleIDs["super-admin"] } },
      update: { isActive: true },
      create: {
        userId: adminUser.id,
        roleId: roleIDs["super-admin"],
        isActive: true,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
    console.log(`BOOTSTRAP: Verified Super Admin authorization for: ${adminUser.email}`);
  }

  console.log("Registry Pruning Completed Successfully.");
}

main()
  .catch((e) => {
    console.error("Cleanup Protocol Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
