import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("Checking System Authorization State...");
  
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  });

  console.log(`Found ${users.length} users.`);
  users.forEach(u => {
    const roles = u.userRoles.map(ur => ur.role.slug).join(", ");
    console.log(`- User: ${u.email} | Roles: [${roles || "NONE"}]`);
  });

  const rolesCount = await prisma.role.count();
  const permsCount = await prisma.permission.count();
  console.log(`System Totals: ${rolesCount} Roles, ${permsCount} Permissions.`);
}

check()
  .catch(console.error)
  .finally(() => pool.end());
