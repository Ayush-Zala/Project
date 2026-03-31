import { prisma } from "./prisma";

/**
 * Identify if a user can manage a specific role.
 * 
 * Rules:
 * 1. Super Admin can manage everything.
 * 2. Nobody can manage their own role (Self-Protection).
 * 3. Nobody can manage a parent role (Hierarchy-Protection).
 */
export async function isRoleManagedBy(targetRoleId: number, currentUserId: number): Promise<boolean> {
  const user = await (prisma as any).user.findUnique({
    where: { id: currentUserId },
    include: {
      userRoles: {
        where: { isActive: true },
        include: { role: true }
      }
    }
  });

  if (!user || !user.isActive) return false;

  const userRoles = user.userRoles.map((ur: any) => ur.role);
  const isSuperAdmin = userRoles.some((r: any) => r.slug === 'super-admin');
  
  // Super Admin can manage any role (except maybe themselves if we were strict, but usually they are root)
  if (isSuperAdmin) return true;

  // 1. Self-Protection: Cannot manage your own role
  if (userRoles.some((r: any) => r.id === targetRoleId)) return false;

  // 2. Hierarchy-Protection: Cannot manage a role that is a parent/ancestor of your roles
  for (const uRole of userRoles) {
    let currentParentId = uRole.parentId;
    while (currentParentId) {
       if (currentParentId === targetRoleId) return false; // Target is an ancestor!
       const p = await (prisma as any).role.findUnique({ 
         where: { id: currentParentId }, 
         select: { parentId: true } 
       });
       currentParentId = p?.parentId;
    }
  }

  return true;
}

/**
 * Get all unique permission slugs for a user (The "Granting Mask").
 * Returns the atomic capabilities a user is allowed to "pass down" to subordinates.
 */
export async function getUserCapabilities(userId: number): Promise<string[]> {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        where: { isActive: true, role: { isActive: true } },
        include: { 
          role: { 
            include: { 
              rolePermissions: { 
                where: { isActive: true },
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

  if (!user || !user.isActive) return [];

  const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.slug === 'super-admin');
  
  // Super Admin has the "Full Manifest" bypass
  if (isSuperAdmin) {
     const all = await (prisma as any).permission.findMany({ 
       where: { isActive: true }, 
       select: { slug: true } 
     });
     return all.map((p: any) => p.slug);
  }

  const rolePerms = user.userRoles.flatMap((ur: any) => 
    ur.role.rolePermissions.map((rp: any) => rp.permission.slug)
  );
  
  const directPerms = user.userPermissions.map((up: any) => up.permission.slug);
  
  return Array.from(new Set([...rolePerms, ...directPerms]));
}
