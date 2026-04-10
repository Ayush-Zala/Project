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
  organisation: ["create", "read", "read_all", "update", "delete", "toggle"],
  organisation_member: ["create", "read", "read_all", "delete", "toggle"],
  organisation_team: ["create", "read", "read_all", "update", "delete", "toggle"],
  organisation_team_member: ["assign", "read", "delete", "toggle"],
  company: ["create", "read", "update", "delete", "toggle"],
  company_client: ["create", "read", "update", "delete", "toggle"],
};

const INDUSTRIES = [
  { name: 'Software & SaaS', description: 'Software products, SaaS platforms, enterprise apps', isActive: true },
  { name: 'IT Services & Consulting', description: 'IT outsourcing, managed services, system integration', isActive: true },
  { name: 'Hardware & Electronics', description: 'Semiconductors, devices, consumer electronics', isActive: true },
  { name: 'Cybersecurity', description: 'Security software, threat intelligence, compliance', isActive: true },
  { name: 'Cloud & Infrastructure', description: 'Cloud platforms, data centres, hosting services', isActive: true },
  { name: 'Artificial Intelligence', description: 'AI/ML products, data science, automation', isActive: true },
  { name: 'Telecommunications', description: 'Telecom operators, internet providers, networking', isActive: true },
  { name: 'Banking', description: 'Retail, commercial, and investment banks', isActive: true },
  { name: 'Insurance', description: 'Life, health, property, and casualty insurance', isActive: true },
  { name: 'Fintech', description: 'Digital payments, lending, neobanks, wallets', isActive: true },
  { name: 'Investment & Asset Management', description: 'Mutual funds, hedge funds, private equity, VC', isActive: true },
  { name: 'Accounting & Tax', description: 'CA/CPA firms, auditing, tax advisory', isActive: true },
  { name: 'Hospitals & Healthcare', description: 'Hospitals, clinics, healthcare providers', isActive: true },
  { name: 'Pharmaceuticals', description: 'Drug manufacturing and distribution', isActive: true },
  { name: 'Medical Devices', description: 'Diagnostic and surgical equipment', isActive: true },
  { name: 'Biotechnology', description: 'Biotech research, genomics, life sciences', isActive: true },
  { name: 'Health & Wellness', description: 'Fitness, mental health, nutrition, wellness apps', isActive: true },
  { name: 'Automotive', description: 'Vehicle manufacturers, OEMs, auto parts', isActive: true },
  { name: 'Aerospace & Defence', description: 'Aircraft, spacecraft, defence systems', isActive: true },
  { name: 'Industrial Manufacturing', description: 'Machinery, tools, industrial equipment', isActive: true },
  { name: 'Consumer Goods', description: 'FMCG, packaged goods, household products', isActive: true },
  { name: 'Chemicals', description: 'Specialty chemicals, plastics, coatings', isActive: true },
  { name: 'Textiles & Apparel', description: 'Clothing, fabrics, fashion brands', isActive: true },
  { name: 'Oil & Gas', description: 'Exploration, production, refining, distribution', isActive: true },
  { name: 'Renewable Energy', description: 'Solar, wind, hydro, green energy', isActive: true },
  { name: 'Mining & Metals', description: 'Mining operations, metal processing', isActive: true },
  { name: 'Utilities', description: 'Electricity, gas, water supply companies', isActive: true },
  { name: 'Real Estate', description: 'Property development, REITs, brokers', isActive: true },
  { name: 'Construction', description: 'Residential and commercial construction', isActive: true },
  { name: 'Architecture & Engineering', description: 'Design, civil engineering, urban planning', isActive: true },
  { name: 'Facilities Management', description: 'Property maintenance, FM services', isActive: true },
  { name: 'Retail', description: 'Physical and multi-channel retail stores', isActive: true },
  { name: 'E-Commerce', description: 'Online marketplaces and DTC brands', isActive: true },
  { name: 'Food & Beverage', description: 'Food production, restaurants, beverage brands', isActive: true },
  { name: 'Hospitality & Hotels', description: 'Hotels, resorts, hospitality management', isActive: true },
  { name: 'Travel & Tourism', description: 'Airlines, travel agencies, OTAs', isActive: true },
  { name: 'Legal Services', description: 'Law firms, legal tech, compliance', isActive: true },
  { name: 'Management Consulting', description: 'Strategy, operations, business consulting', isActive: true },
  { name: 'Marketing & Advertising', description: 'Ad agencies, digital marketing, PR', isActive: true },
  { name: 'Human Resources', description: 'Staffing, recruitment, HR software', isActive: true },
  { name: 'Research & Analytics', description: 'Market research, data analytics firms', isActive: true },
  { name: 'Education & EdTech', description: 'Schools, universities, online learning', isActive: true },
  { name: 'Non-profit & NGO', description: 'Charities, foundations, social enterprises', isActive: true },
  { name: 'Government & Public Sector', description: 'Government bodies, public institutions', isActive: true },
  { name: 'Media & Publishing', description: 'Newspapers, magazines, digital media', isActive: true },
  { name: 'Entertainment & Gaming', description: 'Studios, gaming companies, streaming', isActive: true },
  { name: 'Sports & Recreation', description: 'Sports teams, fitness, recreational services', isActive: true },
  { name: 'Logistics & Supply Chain', description: 'Freight, 3PL, warehousing, last-mile', isActive: true },
  { name: 'Transportation', description: 'Road, rail, sea, air transport operators', isActive: true },
  { name: 'Agriculture & Farming', description: 'Crop production, livestock, agri-tech', isActive: true },
  { name: 'Food Processing', description: 'Processing and packaging of food products', isActive: true },
  { name: 'Other', description: 'Industries not covered by other categories', isActive: true }
];

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

  // 1.1 Industries (Industrial Preseed)
  console.log(`Industry Module: Seeding ${INDUSTRIES.length} entries...`);
  for (const ind of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { name: ind.name },
      update: { description: ind.description },
      create: {
        ...ind,
        createdAt: epochNow,
        updatedAt: epochNow,
      },
    });
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
        organisation_team_member: "Organisation Team Members",
        company: "Companies",
        company_client: "Company Clients",
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
        assign: "Assign",
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
