import { Prisma } from "@prisma/client";
import { auditStorage, getAuditContext } from "./audit-context";
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

function flattenPayload(payload: any): any {
   if (!payload || typeof payload !== "object") return payload;
   const flattened = { ...payload };

   for (const key in flattened) {
      const value = flattened[key];

      // 🛡️ REFINED FLATTENING: 
      // Only flatten objects that look like identifiers/composite keys.
      // If an object has 'name', 'email', 'slug', or 'title', it's likely a Relation (e.g. parent, user, team).
      // We MUST NOT flatten relations as they will overwrite the primary record's name/details.
      if (value && typeof value === "object" && !Array.isArray(value)) {
         const hasIdentityFields = ["name", "email", "slug", "title", "resource", "action"].some(f => f in value);

         if (!hasIdentityFields) {
            // Safe to flatten (likely a where clause, composite key, or ID wrapper)
            Object.assign(flattened, value);
         }
      }
   }
   return flattened;
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
                  if (manualActor && typeof Number(manualActor) === "number" && Number(manualActor) > 0) {
                     actorId = Number(manualActor);
                  }
               }

               // 🛡️ Ensure actorId is zero-safe (Postgres IDs are 1+)
               if (actorId && (isNaN(actorId) || actorId <= 0)) actorId = null;

               let oldData: any = null;

               // 🛡️ Pre-fetch 'Before' state for updates and deletes
               if (["update", "delete", "upsert"].includes(operation) && args.where) {
                  try {
                     oldData = await (client as any)[model].findUnique({ where: args.where });
                  } catch (e) { }
               }

               // Execute operation
               let result: any = null;
               let operationError: any = null;
               try {
                  result = await query(args);
               } catch (e) {
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

                     // 🛡️ Handle Primitive Input (e.g., if just an ID is passed)
                     if (typeof data === "number" || typeof data === "string") {
                        const sData = String(data);
                        if (sData === "-1") return "New Item";
                        return sData;
                     }

                     // 🛡️ Handle Data Object with -1 placeholder
                     if (data.id === -1 || data.id === "-1") return "New Item";

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
                        if (m === "organisation") {
                           const oId = data.organizationId || data.id;
                           const o = await (client as any).organisation.findUnique({ where: { id: oId }, select: { name: true } });
                           return o?.name || String(oId);
                        }
                        if (m === "organisationteam") {
                           const otId = data.teamId || data.id;
                           const ot = await (client as any).organisationTeam.findUnique({ where: { id: otId }, select: { name: true } });
                           return ot?.name || String(otId);
                        }
                        if (m === "company") {
                           const cId = data.companyId || data.id;
                           const c = await (client as any).company.findUnique({ where: { id: cId }, select: { name: true } });
                           return c?.name || String(cId);
                        }
                        if (m === "companyclient") {
                           const ccId = data.clientId || data.id;
                           const cc = await (client as any).companyClient.findUnique({ where: { id: ccId }, select: { fullName: true } });
                           return cc?.fullName || String(ccId);
                        }
                        if (m === "companymember") {
                           const cmId = data.id;
                           const cm = await (client as any).companyMember.findUnique({
                              where: { id: cmId },
                              include: {
                                 member: { include: { user: { select: { name: true } } } },
                                 company: { select: { name: true } }
                              }
                           });
                           return cm ? `${cm.member.user.name} @ ${cm.company.name}` : String(cmId);
                        }
                        if (m === "companycontact" || m === "companyclientcontact") {
                           const contact = data.type && data.value ? data : await (client as any)[m].findUnique({ where: { id: data.id || data.contactId } });
                           if (contact) {
                              const typeLabel = contact.type === "OTHER" ? (contact.otherType || "Other") : contact.type;
                              return `${typeLabel}: ${contact.value}`;
                           }
                        }
                        if (m === "companyclientsocialprofile") {
                           const sId = data.id || data.socialId || id;
                           const social = data.platform && data.url ? data : (sId ? await (client as any).companyClientSocialProfile.findUnique({ where: { id: Number(sId) } }) : null);
                           if (social) {
                              const platformLabel = social.platform === "OTHER" ? (social.otherPlatform || "Other") : social.platform;
                              return `${platformLabel}: ${social.url}`;
                           }
                        }
                     } catch (e) { }


                     // 🛡️ Clean Fallback: Handle Object/BigInt strings and specific placeholders
                     const safeId = (typeof id === "object" && id !== null) ? JSON.stringify(id) : String(id || "");
                     if (safeId === "-1" || safeId === "") return "New Item";

                     // If we are here, we couldn't resolve a name, so we return the ID with a label
                     return safeId ? `Record #${safeId}` : "Unknown";
                  }

                  // 🛡️ DYNAMIC ACTION CLASSIFICATION
                  let finalAction = context?.action || baseAction;

                  // 🛡️ Automatic Toggle Detection (Dynamic across all models)
                  if (!context?.action && baseAction === "UPDATE" && metaData?.after) {
                     const changedKeys = Object.keys(metaData.after);
                     if (changedKeys.length > 0 && changedKeys.every(k => ["isActive", "updatedBy", "updatedAt", "modifiedAt"].includes(k))) {
                        finalAction = "Toggle";
                     }
                  }

                  // Junction Specific Logic (Legacy/Override)
                  if (!context?.action && ["rolepermission", "userpermission", "userrole", "teammember", "teammemberrole", "organisationmember", "organisationteammember", "companymember"].includes(safeModel)) {
                     if (baseAction === "DELETE") finalAction = "REVOKE";
                     else if (baseAction === "UPDATE") {
                        if (finalAction !== "Toggle") finalAction = "UPDATE";
                     } else finalAction = "ASSIGN";
                  }


                  // Resolve Target User
                  let targetUserId: number | null = null;
                  if (["user", "userpermission", "userrole", "teammember", "teammemberrole", "organisationmember", "organisationteammember", "companymember"].includes(safeModel)) {
                     const tid = result?.userId || oldData?.userId || args?.data?.userId || (safeModel === "user" ? (result?.id || oldData?.id || args?.where?.id) : null);

                     // For companymember, we can resolve the target user from the organisationMember
                     if (safeModel === "companymember" && !tid) {
                        const omId = result?.organizationMemberId || oldData?.organizationMemberId || args?.data?.organizationMemberId;
                        if (omId) {
                           try {
                              const om = await (client as any).organisationMember.findUnique({ where: { id: omId }, select: { userId: true } });
                              if (om) targetUserId = Number(om.userId);
                           } catch (e) { }
                        }
                     } else if (tid) {
                        targetUserId = Number(tid);
                     }
                  } else if (["session", "account"].includes(safeModel)) {

                     const tid = result?.userId || oldData?.userId || args?.data?.userId;
                     if (tid) targetUserId = Number(tid);
                  }

                  // 🚫 DUPLICATE PROTECTION: Only skip technical cleanup for internal mapping/sync operations.
                  const isJunctionCleanup = [
                     "rolepermission", "userpermission", "userrole",
                     "companycontact", "companyclient", "companyclientcontact", "companyclientsocialprofile"
                  ].includes(safeModel) && operation === "deleteMany";


                  // 🛡️ SUPPRESSION: Ignore bulk operations that touched zero records
                  if (["deleteMany", "updateMany"].includes(operation) && (!result || result.count === 0)) {
                     return;
                  }

                  if (!isJunctionCleanup && (operationError || finalAction !== "UPDATE" || metaData)) {
                     const rawPayload = { ...oldData, ...result, ...args?.data, ...args?.where };
                     const payload = flattenPayload(rawPayload);
                     let auditDescription = "";

                     // 🛡️ UNIVERSAL INTELLIGENT DESCRIPTION GENERATOR
                     const objName = await resolveName(safeModel, payload);
                     const modelLabel = model.charAt(0).toUpperCase() + model.slice(1);

                     // 🛡️ Special Case: Bulk Operations (DELETE_MANY / UPDATE_MANY)
                     if (operation === "deleteMany" || operation === "updateMany") {
                        const count = result?.count || 0;
                        let contextName = "Unknown";

                        // Try to find a parent context (e.g., Company) from the filter
                        if (payload.companyId) {
                           contextName = await resolveName("company", { id: payload.companyId });
                        } else if (payload.organizationId) {
                           contextName = await resolveName("organisation", { id: payload.organizationId });
                        } else if (payload.clientId) {
                           contextName = await resolveName("companyclient", { id: payload.clientId });
                        }

                        if (operation === "deleteMany") {
                           auditDescription = `Bulk removal of ${count} ${modelLabel} items`;
                           if (contextName !== "Unknown") auditDescription += ` from ${contextName}`;
                        } else {
                           auditDescription = `Bulk update of ${count} ${modelLabel} items`;
                           if (contextName !== "Unknown") auditDescription += ` in ${contextName}`;
                        }
                     }
                     else if (finalAction === "Toggle" || finalAction === "TOGGLE") {
                        const newStatus = (result?.isActive === false || payload.isActive === false) ? "inactive" : "active";
                        auditDescription = `${modelLabel} ${objName} marked as ${newStatus}`;
                     }
                     // Model-specific overrides for complex descriptions
                     else if (safeModel === "userrole") {
                        const rName = await resolveName("role", payload);
                        const uName = await resolveName("user", payload);
                        auditDescription = baseAction === "DELETE" ? `Role ${rName} removed from user ${uName}` : `Role ${rName} assigned to user ${uName}`;
                     } else if (safeModel === "rolepermission") {
                        const pName = await resolveName("permission", payload);
                        const rName = await resolveName("role", payload);
                        auditDescription = baseAction === "DELETE" ? `Permission ${pName} removed from role ${rName}` : `Permission ${pName} added to role ${rName}`;
                     } else if (safeModel === "userpermission") {
                        const pName = await resolveName("permission", payload);
                        const uName = await resolveName("user", payload);
                        auditDescription = baseAction === "DELETE" ? `Permission ${pName} revoked from user ${uName}` : `Permission ${pName} granted to user ${uName}`;
                     } else if (safeModel === "teammemberrole") {
                        let uName = "Unknown User", trName = "Unknown Role", tName = "Unknown Team";
                        try {
                           const tmId = payload.teamMemberId;
                           const trId = payload.teamRoleId;
                           if (tmId && trId) {
                              const fullRecord = await (client as any).teamMemberRole.findUnique({
                                 where: { teamMemberId_teamRoleId: { teamMemberId: Number(tmId), teamRoleId: Number(trId) } },
                                 include: { role: { select: { name: true } }, member: { include: { user: { select: { name: true, email: true } }, team: { select: { name: true } } } } }
                              });
                              if (fullRecord) {
                                 trName = fullRecord.role?.name || trName;
                                 uName = fullRecord.member?.user?.name || fullRecord.member?.user?.email || uName;
                                 tName = fullRecord.member?.team?.name || tName;
                                 if (fullRecord.member?.userId) targetUserId = Number(fullRecord.member.userId);
                              }
                           }
                        } catch (e) { }
                        auditDescription = baseAction === "DELETE" ? `Team role ${trName} revoked from user ${uName} in Team ${tName}` : `Team role ${trName} granted to user ${uName} in Team ${tName}`;
                     } else if (safeModel === "organisationmember") {
                        const oName = await resolveName("organisation", payload);
                        const uName = await resolveName("user", payload);

                        if (baseAction === "DELETE") {
                           auditDescription = `Organisation Member ${uName} removed from Organisation ${oName}`;
                        } else if (finalAction === "Toggle" || finalAction === "TOGGLE") {
                           const newStatus = (result?.isActive === false || payload.isActive === false) ? "inactive" : "active";
                           auditDescription = `Organisation Member ${uName} marked as ${newStatus} in Organisation ${oName}`;
                        } else {
                           auditDescription = `Organisation Member ${uName} role updated to ${result?.role || payload.role} in Organisation ${oName}`;
                        }
                     } else if (safeModel === "organisationinvitation") {
                        const oName = await resolveName("organisation", payload);
                        const targetEmail = payload.email || "Unknown";
                        if (finalAction === "CREATE") auditDescription = `Invitation sent to ${targetEmail} for Organisation ${oName}`;
                        else if (finalAction === "DELETE") auditDescription = `Invitation for ${targetEmail} was deleted`;
                        else auditDescription = `Invitation for ${targetEmail} status updated to ${result?.status || payload.status}`;
                     } else if (safeModel === "organisationteam") {
                        const otName = await resolveName("organisationteam", payload);
                        const oName = await resolveName("organisation", payload);
                        if (finalAction === "CREATE") auditDescription = `Organisation team ${otName} was created in ${oName}`;
                        else if (finalAction === "DELETE") auditDescription = `Organisation team ${otName} was deleted`;
                        else auditDescription = `Organisation team ${otName} details were updated`;
                     } else if (safeModel === "organisationteammember") {
                        const otName = await resolveName("organisationteam", payload);
                        const uName = await resolveName("user", payload);
                        if (baseAction === "DELETE") auditDescription = `User ${uName} removed from Organisation team ${otName}`;
                        else auditDescription = `User ${uName} added to Organisation team ${otName}`;
                     } else if (safeModel === "organisationrole") {
                        const oName = await resolveName("organisation", payload);
                        const rName = payload.role || "Unknown Role";
                        if (finalAction === "CREATE") auditDescription = `Custom role ${rName} created for Organisation ${oName}`;
                        else if (finalAction === "DELETE") auditDescription = `Custom role ${rName} deleted from Organisation ${oName}`;
                        else auditDescription = `Custom role ${rName} updated in Organisation ${oName}`;
                     } else if (safeModel === "companymember") {
                        let uName = "Unknown User", cName = "Unknown Company";
                        try {
                           const omId = payload.organizationMemberId;
                           const compId = payload.companyId;
                           if (omId && compId) {
                              const om = await (client as any).organisationMember.findUnique({ where: { id: omId }, include: { user: { select: { name: true, email: true } } } });
                              const comp = await (client as any).company.findUnique({ where: { id: compId }, select: { name: true } });
                              uName = om?.user?.name || om?.user?.email || uName;
                              cName = comp?.name || cName;
                           }
                        } catch (e) { }
                        auditDescription = baseAction === "DELETE" ? `Access for company ${cName} revoked from user ${uName}` : `Access for company ${cName} granted to user ${uName}`;
                     } else if (safeModel === "companyclient") {
                        const clientName = payload.fullName || "Unknown Client";
                        const compName = await resolveName("company", payload);
                        if (finalAction === "CREATE") auditDescription = `Client ${clientName} was created for company ${compName}`;
                        else if (finalAction === "DELETE") auditDescription = `Client ${clientName} was deleted from company ${compName}`;
                        else auditDescription = `Client ${clientName} details were updated`;
                     } else if (["companycontact", "companyclientcontact"].includes(safeModel)) {
                        const type = payload.type === "OTHER" ? (payload.otherType || "Other") : payload.type;
                        if (finalAction === "CREATE") auditDescription = `${type} ${payload.value} was added`;
                        else if (finalAction === "DELETE") auditDescription = `${type} ${payload.value} was removed`;
                        else {
                           const changes = metaData?.after ? Object.keys(metaData.after).filter(k => !["updatedAt", "updatedBy"].includes(k)) : [];
                           if (changes.includes("value")) auditDescription = `${type} updated to ${payload.value}`;
                           else auditDescription = `${type} contact details were updated`;
                        }
                     } else if (safeModel === "companyclientsocialprofile") {
                        const platform = payload.platform === "OTHER" ? (payload.otherPlatform || "Other") : payload.platform;
                        if (finalAction === "CREATE") auditDescription = `${platform} profile added: ${payload.url}`;
                        else if (finalAction === "DELETE") auditDescription = `${platform} profile removed`;
                        else {
                           const changes = metaData?.after ? Object.keys(metaData.after).filter(k => !["updatedAt", "updatedBy"].includes(k)) : [];
                           if (changes.includes("url")) auditDescription = `${platform} URL updated to ${payload.url}`;
                           else auditDescription = `${platform} profile details were updated`;
                        }
                     }
                     // Fallback for CREATE/DELETE/UPDATE
                     else {
                        if (finalAction === "CREATE") auditDescription = `${modelLabel} ${objName} was created`;
                        else if (finalAction === "DELETE") auditDescription = `${modelLabel} ${objName} was deleted`;
                        else auditDescription = `${modelLabel} ${objName} details were updated`;
                     }

                     let errorReason = null;
                     if (operationError) errorReason = operationError instanceof Error ? operationError.message : String(operationError);

                     if (context?.skipAudit) return;

                     const finalTargetUserId = (targetUserId && !isNaN(targetUserId) && targetUserId > 0) ? targetUserId : null;
                     const finalActorId = (actorId && !isNaN(actorId) && actorId > 0) ? Number(actorId) : null;

                     try {
                        const auditLogModel = (client as any).auditLog;
                        if (!auditLogModel) return;

                        await auditLogModel.create({
                           data: {
                              userId: finalTargetUserId,
                              createdBy: finalActorId,
                              action: finalAction,
                              resource: model.toLowerCase(),
                              metaData: { ...metaData, targetId: result?.id || oldData?.id || args?.where?.id || null, targetUserId: finalTargetUserId },
                              ipAddress: ipAddress || "::1",
                              userAgent: userAgent || "DYNAMIC_ENGINE/1.0",
                              status: operationError ? "FAILURE" : "SUCCESS",
                              reason: errorReason || genericReason || auditDescription,
                           }
                        });
                     } catch (auditCreateError) {
                        console.error(`[AUDIT_LOG_CREATE_FAILED]`, auditCreateError);
                     }
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
