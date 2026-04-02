import { prisma } from "./prisma";
import { createActivityEntry } from "./activity-logger";

/**
 * Checks if a user has a specific permission.
 * 
 * Logic:
 * 1. If user is Super Admin (role slug 'super-admin'), always return true.
 * 2. Check if user has an active Role with an active RolePermission for this slug.
 * 3. Check if user has a direct active UserPermission for this slug.
 * 
 * Note: Discrete permissions (no inheritance from parent roles per user request).
 */
export async function hasPermission(userId: number, permissionSlug: string): Promise<boolean> {
  try {
    // 1. Fetch user roles and direct permissions in one go or sequentially
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        userRoles: {
          where: { isActive: true, role: { isActive: true } },
          select: {
            role: {
              select: {
                slug: true,
                rolePermissions: {
                  where: { 
                    isActive: true, 
                    permission: { slug: permissionSlug, isActive: true } 
                  },
                  select: { id: true }
                }
              }
            }
          }
        },
        userPermissions: {
          where: { 
            isActive: true, 
            permission: { slug: permissionSlug, isActive: true } 
          },
          select: { id: true }
        }
      }
    });

    if (!user || !user.isActive) return false;

    // 2. Super Admin check
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.slug === "super-admin");
    if (isSuperAdmin) return true;

    // 3. Role-based permission check
    const hasViaRole = user.userRoles.some((ur: any) => ur.role.rolePermissions.length > 0);
    if (hasViaRole) return true;

    // 4. Direct user permission check
    const hasDirect = user.userPermissions.length > 0;
    if (hasDirect) return true;

    return false;
  } catch (error) {
    console.error("[RBAC_CHECK_ERROR]", error);
    return false;
  }
}

/**
 * Higher-order function or helper for API routes to enforce permissions.
 */
export async function validatePermission(userId: number, permissionSlug: string) {
  const allowed = await hasPermission(userId, permissionSlug);
  if (!allowed) {
    // 🛡️ Log Permission Denied Server Event
    await createActivityEntry({
      userId,
      type: "PERMISSION_DENIED",
      description: `Access denied for user #${userId} attempting to execute [${permissionSlug}]`,
    });

    throw new Error("PERMISSION_DENIED");
  }
  return true;
}
