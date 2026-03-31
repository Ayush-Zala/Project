import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET: Returns a complete list of permission slugs for the current user.
 * Supports both role-based and direct user-level assignments.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  // 1. Fetch user with role permissions (if role exists)
  // 2. Fetch direct user permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        where: { isActive: true, role: { isActive: true } },
        include: {
          role: {
            include: {
              rolePermissions: {
                where: { isActive: true, permission: { isActive: true } },
                include: { permission: true }
              }
            }
          }
        }
      },
      userPermissions: {
        where: { isActive: true, permission: { isActive: true } },
        include: { permission: true }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ permissions: [] });
  }

  // Collect all permission slugs from roles
  const rolePerms = user.userRoles.flatMap(ur => 
    ur.role.rolePermissions.map(rp => rp.permission.slug)
  );

  // Collect direct permissions
  const directPerms = user.userPermissions.map(up => up.permission.slug);

  // Deduplicate
  const allPerms = Array.from(new Set([...rolePerms, ...directPerms]));

  // Include super-admin bypass flag
  const isSuperAdmin = user.userRoles.some(ur => ur.role.slug === 'super-admin');

  console.log(`[RBAC DEBUG] User ${userId} (${user.email}) | Roles: ${user.userRoles.length} | Perms: ${allPerms.length} | isSuperAdmin: ${isSuperAdmin}`);

  return NextResponse.json({ 
    permissions: allPerms,
    isSuperAdmin
  });
}
