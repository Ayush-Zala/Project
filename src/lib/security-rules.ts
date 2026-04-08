/**
 * Security Rules for Organisation Roles
 * 
 * Enforces the "Member Role Purity" policy:
 * 1. New members can ONLY be added as 'member'.
 * 2. Roles are immutable once assigned (Owners stay Owners, Members stay Members).
 * 3. Admins/Super-admins are managed at a system level, not per-org via this dialog.
 */

export const ORG_ROLES = ["owner", "member"] as const;
export type OrgRole = typeof ORG_ROLES[number];

/**
 * Determines which roles should be visible in the UI dropdown based on the context.
 */
export function getAvailableRoles(isEditing: boolean, currentRole?: string): OrgRole[] {
  // If adding, only 'member' is allowed
  if (!isEditing) {
    return ["member"];
  }

  // If editing, only the current role is allowed (making it immutable)
  if (currentRole && ORG_ROLES.includes(currentRole as OrgRole)) {
    return [currentRole as OrgRole];
  }

  // Fallback
  return ["member"];
}

/**
 * Validates if a role transition is allowed.
 * Throws an error if the transition is restricted.
 */
export function validateRoleTransition(existingRole: string, requestedRole: string) {
  if (existingRole !== requestedRole) {
    throw new Error(`Role maintenance protocol restricted: [${existingRole}] cannot be transitioned to [${requestedRole}].`);
  }
}

/**
 * Validates if a role assignment is allowed during creation.
 */
export function validateRoleAssignment(role: string) {
  if (role !== "member") {
    throw new Error("Security protocol breach: New members must be assigned the 'member' role by default.");
  }
}
