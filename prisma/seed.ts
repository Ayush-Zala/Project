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
  audit: ["read"],
  organisation: ["create", "read", "update", "delete", "toggle", "manage"],
  organisation_member: ["manage", "read"],
  organisation_team: ["manage", "read"],
  organisation_invite: ["manage", "read"],
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

  // 4. Adding Permissions
  console.log("Adding Permissions: Setting up simple action-oriented labels...");
  for (const [resource, actions] of Object.entries(PERMISSIONS_MANIFEST)) {
    for (const action of actions) {
      const slug = `${resource}:${action}`;
      
      // 🏷️ Simple Labeling Logic
      let name = "";
      let description = "";

      const resourceNames: Record<string, string> = {
        users: "Users",
        roles: "Roles",
        permissions: "Permissions",
        teams: "Teams",
        team_roles: "Team Roles",
        team_members: "Team Members",
        audit: "Logs",
        organisation: "Organization",
        organisation_member: "Organization Members",
        organisation_team: "Organization Teams",
        organisation_invite: "Invites",
      };

      const actionLabels: Record<string, string> = {
        create: "Add",
        read: "View",
        update: "Edit",
        delete: "Delete",
        toggle: "Status",
        assign_role: "Assign Roles",
        assign_permission: "Assign Permissions",
        read_all: "View All",
        manage: "Manage",
      };

      const resLabel = resourceNames[resource] || resource;
      const actLabel = actionLabels[action] || action;

      name = `${actLabel} ${resLabel}`;
      
      if (action === "read") {
        description = `Allows viewing the ${resLabel.toLowerCase()} list.`;
      } else if (action === "create") {
        description = `Allows adding new ${resLabel.toLowerCase()}.`;
      } else if (action === "update") {
        description = `Allows editing existing ${resLabel.toLowerCase()}.`;
      } else if (action === "delete") {
        description = `Allows deleting ${resLabel.toLowerCase()}.`;
      } else {
        description = `Allows the user to ${actLabel.toLowerCase()} ${resLabel.toLowerCase()}.`;
      }

      const permission = await prisma.permission.upsert({
        where: { slug },
        update: { 
          name, 
          description, 
          isActive: true, 
          resource: resourceNames[resource] || resource 
        },
        create: {
          name,
          slug,
          resource: resourceNames[resource] || resource,
          description,
          action,
          isActive: true,
          createdAt: epochNow,
          updatedAt: epochNow,
        },
      });

      // 5. Authorization: Ensure Super Admin has this permission
      await prisma.rolePermission.upsert({
        where: { 
          roleId_permissionId: { 
            roleId: roleIDs["super-admin"], 
            permissionId: permission.id 
          } 
        },
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

  // 6. Bootstrap: Ensure first user is Super Admin
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
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
    console.log(`BOOTSTRAP: Assigned Super Admin role to: ${adminUser.email}`);
  }

  console.log("Database reset and permissions initialized successfully.");
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
