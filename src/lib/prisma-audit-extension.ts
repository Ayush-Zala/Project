import { Prisma } from "@prisma/client";
import { getAuditContext } from "./audit-context";
import { headers } from "next/headers";

/**
 * 🛡️ HIGH-DETAIL INDUSTRIAL AUDIT LOGGING
 * Global Prisma Extension that automatically captures Every State Change.
 * Resolves user identity lazily to ensure 100% coverage without manual middleware.
 */

// 🔒 Fields that MUST be masked for security
const MASKED_FIELDS = ["password", "token", "secret", "accessToken", "refreshToken", "idToken", "value"];
const MASK_VALUE = "********";

/**
 * Deeply mask sensitive values and handle BigInt serialization
 */
function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return Number(data);
  if (typeof data !== "object") return data;
  
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in masked) {
    if (MASKED_FIELDS.includes(key)) {
      masked[key] = MASK_VALUE;
    } else {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
}

/**
 * Filter out unchanged fields to provide a clean forensic diff
 */
function computeDiff(oldData: any, newData: any) {
  const diff: any = { before: {}, after: {} };
  
  const safeOld = maskSensitiveData(oldData);
  const safeNew = maskSensitiveData(newData);

  if (!safeOld) return { before: null, after: safeNew };

  for (const key in safeNew) {
    // Skip internal fields usually updated automatically
    if (["updatedAt", "createdAt", "updatedBy", "modifiedAt"].includes(key)) continue;

    if (JSON.stringify(safeOld[key]) !== JSON.stringify(safeNew[key])) {
      diff.before[key] = safeOld[key];
      diff.after[key] = safeNew[key];
    }
  }

  // If no fields changed, return null
  if (Object.keys(diff.after).length === 0) return null;
  
  return diff;
}

export const prismaAuditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: "audit-logging",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // 🛡️ Skip auditing log models and sessions
          if (model === "AuditLog" || model === "ActivityLog" || model === "Session" || model === "Account" || model === "Verification") {
            return query(args);
          }

          const mutationOperations = ["create", "update", "delete", "upsert", "updateMany", "deleteMany"];
          if (!mutationOperations.includes(operation)) {
            return query(args);
          }

          // 🛡️ Lazy Identity Resolution
          let actorId: number | null = null;
          let ipAddress: string | null = null;
          let userAgent: string | null = null;
          let genericReason: string | null = null;

          const context = getAuditContext();
          if (context) {
            actorId = context.userId ? Number(context.userId) : null;
            ipAddress = context.ipAddress || null;
            userAgent = context.userAgent || null;
            genericReason = context.reason || null;
          }

          // If no context, try to resolve from Next.js headers/session lazily
          if (!actorId) {
            try {
              const head = await headers();
              const { auth } = await import("./auth");
              const session = await auth.api.getSession({ headers: head });
              if (session?.user) {
                actorId = Number(session.user.id);
                ipAddress = head.get("x-forwarded-for") || head.get("x-real-ip");
                userAgent = head.get("user-agent");
              }
            } catch (e) {
              // Not in a request context (e.g. background job/build time) - allow null
            }
          }

          // Fallback: If headers failed (Next.js Dynamic Server Usage error), sniff args
          if (!actorId && args?.data) {
             const manualActor = args.data.updatedBy || args.data.createdBy || args.data.userId;
             if (manualActor) actorId = Number(manualActor);
          }
          
          let oldData: any = null;

          // 🛡️ Pre-fetch 'Before' state for updates and deletes
          if (["update", "delete", "upsert"].includes(operation) && args.where) {
            try {
              oldData = await (client as any)[model].findUnique({ where: args.where });
            } catch (e) {}
          }

          // Execute operation
          let result: any = null;
          let operationError: any = null;
          try {
             result = await query(args);
          } catch(e) {
             operationError = e;
          }

          // 🛡️ Synchronous Auditing (guarantees completion before serverless route ends)
          try {
            const actionMap: Record<string, string> = {
                create: "CREATE",
                update: "UPDATE",
                delete: "DELETE",
                upsert: oldData ? "UPDATE" : "CREATE",
                updateMany: "UPDATE_MANY",
                deleteMany: "DELETE_MANY"
            };

            const baseAction = actionMap[operation] || operation.toUpperCase();
            let metaData: any = null;

            if (operationError) {
                metaData = { args: maskSensitiveData(args) };
            } else if (operation === "create") {
                metaData = { before: null, after: maskSensitiveData(result) };
            } else if (operation === "update" || (operation === "upsert" && oldData)) {
                metaData = computeDiff(oldData, result);
            } else if (operation === "delete") {
                metaData = { before: maskSensitiveData(oldData), after: null };
            } else {
                metaData = { filter: args.where, data: maskSensitiveData(args.data) };
            }

            const safeModel = model.toLowerCase();

            // 🛡️ Human-Readable Identifier Resolver
            async function resolveName(m: string, data: any): Promise<string> {
               if (!data) return "Unknown";
               const id = data.id || data.userId || data.roleId || data.permissionId || data.teamId || data.memberId;
               
               // 1. Check for immediate identifiers
               const direct = data.name || data.email || data.slug || data.title;
               if (direct) return direct;

               // 2. Fetch from DB if only ID is present
               try {
                  if (m === "user") {
                     const uId = data.userId || data.id;
                     const u = await (client as any).user.findUnique({ where: { id: uId }, select: { email: true } });
                     return u?.email || String(uId);
                  }
                  if (m === "role") {
                     const rId = data.roleId || data.id;
                     const r = await (client as any).role.findUnique({ where: { id: rId }, select: { name: true } });
                     return r?.name || String(rId);
                  }
                  if (m === "permission") {
                     const pId = data.permissionId || data.id;
                     const p = await (client as any).permission.findUnique({ where: { id: pId }, select: { slug: true } });
                     return p?.slug || String(pId);
                  }
                  if (m === "team") {
                     const tId = data.teamId || data.id;
                     const t = await (client as any).team.findUnique({ where: { id: tId }, select: { name: true } });
                     return t?.name || String(tId);
                  }
                  if (m === "teamrole") {
                     const trId = data.teamRoleId || data.id;
                     const tr = await (client as any).teamRole.findUnique({ where: { id: trId }, select: { name: true } });
                     return tr?.name || String(trId);
                  }
               } catch (e) {}
               
               return String(id || "Unknown");
            }

            // Refine Action based on Context
            let finalAction = baseAction;
            if (["rolepermission", "userpermission", "userrole", "teammember", "teammemberrole"].includes(safeModel)) {
               if (baseAction === "DELETE") finalAction = "REVOKE";
               else if (baseAction === "UPDATE") {
                  const changedKeys = metaData?.after ? Object.keys(metaData.after) : [];
                  if (changedKeys.includes("isActive")) finalAction = "TOGGLE";
                  else finalAction = "UPDATE";
               } else finalAction = "ASSIGN";
            } else if (baseAction === "UPDATE" && metaData?.after) {
               const changedKeys = Object.keys(metaData.after);
               if (changedKeys.length > 0 && changedKeys.every(k => ["isActive", "updatedBy", "updatedAt", "modifiedAt"].includes(k))) {
                  finalAction = "TOGGLE";
               }
            }

            // Resolve Target User
            let targetUserId: number | null = null;
            if (["user", "userpermission", "userrole", "teammember", "teammemberrole"].includes(safeModel)) {
               const tid = result?.userId || oldData?.userId || args?.data?.userId || result?.id || oldData?.id || args?.where?.id;
               if (tid) targetUserId = Number(tid);
            } else if (["session", "account"].includes(safeModel)) {
               const tid = result?.userId || oldData?.userId || args?.data?.userId;
               if (tid) targetUserId = Number(tid);
            }

            // 🚫 DUPLICATE PROTECTION: Suppress 'deleteMany' on junction tables (often part of a sync/cleanup)
            const isJunctionCleanup = ["rolepermission", "userpermission", "userrole", "teammember", "teammemberrole"].includes(safeModel) && operation === "deleteMany";

            if (!isJunctionCleanup && (operationError || finalAction !== "UPDATE" || metaData)) {
                // 📝 Human-readable reason — no redundant action/model prefixes
                 const payload = { ...oldData, ...result, ...args?.data, ...args?.where };
                 let auditDescription = "";

                 if (safeModel === "userrole") {
                    const rName = await resolveName("role", payload);
                    const uName = await resolveName("user", payload);
                    auditDescription = baseAction === "DELETE"
                       ? `Role ${rName} removed from user ${uName}`
                       : `Role ${rName} assigned to user ${uName}`;
                 } else if (safeModel === "rolepermission") {
                    const pName = await resolveName("permission", payload);
                    const rName = await resolveName("role", payload);
                    auditDescription = baseAction === "DELETE"
                       ? `Permission ${pName} removed from role ${rName}`
                       : `Permission ${pName} added to role ${rName}`;
                 } else if (safeModel === "userpermission") {
                    const pName = await resolveName("permission", payload);
                    const uName = await resolveName("user", payload);
                    auditDescription = baseAction === "DELETE"
                       ? `Permission ${pName} revoked from user ${uName}`
                       : `Permission ${pName} granted to user ${uName}`;
                 } else if (safeModel === "teammember") {
                    const tName = await resolveName("team", payload);
                    const uName = await resolveName("user", payload);
                    if (baseAction === "DELETE") {
                       auditDescription = `User ${uName} removed from team ${tName}`;
                    } else if (baseAction === "UPDATE") {
                       // Distinguish toggle (isActive) from other updates
                       const newStatus = result?.isActive === false ? "inactive" : "active";
                       const isToggle = payload.isActive !== undefined || result?.isActive !== undefined;
                       auditDescription = isToggle
                          ? `User ${uName} marked ${newStatus} in team ${tName}`
                          : `User ${uName} membership updated in team ${tName}`;
                    } else {
                       auditDescription = `User ${uName} added to team ${tName}`;
                    }
                 } else if (safeModel === "user") {
                    const uName = await resolveName("user", payload);
                    if (finalAction === "CREATE") auditDescription = `User ${uName} was created`;
                    else if (finalAction === "DELETE") auditDescription = `User ${uName} was deleted`;
                    else if (finalAction === "TOGGLE") {
                       const newStatus = result?.isActive === false ? "inactive" : "active";
                       auditDescription = `User ${uName} marked as ${newStatus}`;
                    } else auditDescription = `User ${uName} details were updated`;
                 } else if (safeModel === "role") {
                    const rName = await resolveName("role", payload);
                    if (finalAction === "CREATE") auditDescription = `Role ${rName} was created`;
                    else if (finalAction === "DELETE") auditDescription = `Role ${rName} was deleted`;
                    else if (finalAction === "TOGGLE") {
                       const newStatus = result?.isActive === false ? "inactive" : "active";
                       auditDescription = `Role ${rName} marked as ${newStatus}`;
                    } else auditDescription = `Role ${rName} details were updated`;
                 } else if (safeModel === "permission") {
                    const pName = await resolveName("permission", payload);
                    if (finalAction === "CREATE") auditDescription = `Permission ${pName} was created`;
                    else if (finalAction === "DELETE") auditDescription = `Permission ${pName} was deleted`;
                    else if (finalAction === "TOGGLE") {
                       const newStatus = result?.isActive === false ? "inactive" : "active";
                       auditDescription = `Permission ${pName} marked as ${newStatus}`;
                    } else auditDescription = `Permission ${pName} details were updated`;
                 } else if (safeModel === "teammemberrole") {
                    const trName = await (async () => {
                       try {
                          const trId = payload.teamRoleId;
                          if (trId) {
                             const tr = await (client as any).teamRole.findUnique({ where: { id: trId }, select: { name: true } });
                             if (tr?.name) return tr.name;
                          }
                       } catch(e) {}
                       return "Unknown Role";
                    })();
                    const uName = await (async () => {
                       try {
                          const memberId = payload.teamMemberId;
                          if (memberId) {
                             const member = await (client as any).teamMember.findUnique({
                                where: { id: memberId },
                                select: { user: { select: { name: true, email: true } } }
                             });
                             if (member?.user) return member.user.name || member.user.email;
                          }
                       } catch(e) {}
                       return "Unknown User";
                    })();
                    auditDescription = baseAction === "DELETE"
                       ? `Team role ${trName} revoked from user ${uName}`
                       : `Team role ${trName} granted to user ${uName}`;
                 } else if (safeModel === "team") {
                    const tName = await resolveName("team", payload);
                    if (finalAction === "CREATE") auditDescription = `Team ${tName} was created`;
                    else if (finalAction === "DELETE") auditDescription = `Team ${tName} was deleted`;
                    else if (finalAction === "TOGGLE") {
                       const newStatus = result?.isActive === false ? "inactive" : "active";
                       auditDescription = `Team ${tName} marked as ${newStatus}`;
                    } else auditDescription = `Team ${tName} details were updated`;
                 } else if (safeModel === "teamrole") {
                    const trName = payload.name || "Unknown";
                    if (finalAction === "CREATE") auditDescription = `Team role ${trName} was created`;
                    else if (finalAction === "DELETE") auditDescription = `Team role ${trName} was deleted`;
                    else auditDescription = `Team role ${trName} was updated`;
                 } else {
                    const name = payload.name || payload.email || payload.slug || payload.id || model;
                    if (finalAction === "CREATE") auditDescription = `${model} ${name} was created`;
                    else if (finalAction === "DELETE") auditDescription = `${model} ${name} was deleted`;
                    else if (finalAction === "TOGGLE") auditDescription = `${model} ${name} status was toggled`;
                    else auditDescription = `${model} ${name} was updated`;
                 }
                
                let errorReason = null;
                if (operationError) {
                   errorReason = operationError instanceof Error ? operationError.message : String(operationError);
                }

                await (client as any).auditLog.create({
                    data: {
                        userId: targetUserId,
                        createdBy: actorId,
                        action: finalAction,
                        resource: model.toLowerCase(),
                        metaData: metaData as any,
                        ipAddress: ipAddress || "DYNAMIC_RESOLVER",
                        userAgent: userAgent || "PRISMA_EXTENSION",
                        status: operationError ? "FAILURE" : "SUCCESS",
                        reason: errorReason || genericReason || auditDescription,
                    }
                });
            }
          } catch (auditError) {
            console.error(`[AUDIT_EXTENSION_ERROR]`, auditError);
          }

          if (operationError) throw operationError;
          return result;
        }
      }
    }
  });
});
