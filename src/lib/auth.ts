import { betterAuth, APIError } from "better-auth";
import { organization } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getVerificationEmailTemplate, getResetPasswordEmailTemplate } from "./email-templates";
import { createActivityEntry } from "./activity-logger";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // 🛡️ Bootstrap Logic: First user to sign up becomes the Ultimate Admin
          const userCount = await prisma.user.count();
          if (userCount === 1) {
            console.log(`🛡️ FIRST USER DETECTED: Provisioning Super Admin Role for [${user.email}]`);
            
            const superRole = await prisma.role.findUnique({
              where: { slug: "super-admin" }
            });

            if (superRole) {
              const epochNow = BigInt(Date.now());
              await prisma.userRole.upsert({
                where: { 
                  userId_roleId: { 
                    userId: Number(user.id), 
                    roleId: superRole.id 
                  } 
                },
                update: { isActive: true },
                create: {
                  userId: Number(user.id),
                  roleId: superRole.id,
                  isActive: true,
                  createdAt: epochNow,
                  updatedAt: epochNow,
                }
              });
              console.log("Super Admin Protocol Manifested.");
            }
          }
        }
      },
      update: {
        after: async (user: any) => {
          if (user.isActive === false) {
            await prisma.session.deleteMany({
              where: { userId: Number(user.id) },
            });
          }
        },
      },
    },
    session: {
      create: {
        after: async (session: any) => {
          // 🛡️ Log Successful Login
          const user = await prisma.user.findUnique({
            where: { id: Number(session.userId) },
            select: { email: true }
          });
          
          await createActivityEntry({
            userId: Number(session.userId),
            type: "LOGIN",
            description: `User ${user?.email || session.userId} logged in`,
          });
        }
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
        html: getResetPasswordEmailTemplate(url, user.name),
      });
    },
    onPasswordReset: async ({ user }, request) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
        html: getVerificationEmailTemplate(url, user.name),
      });
    },
  },
  plugins: [
    nextCookies(),
    {
      id: "industrial-audit-logging",
      hooks: {
        before: [
          {
            matcher: (ctx) => !!ctx.path && ctx.path.includes("/sign-in/email"),
            handler: async (ctx: any) => {
              const body = ctx.body as unknown as { email?: string };
              if (body?.email) {
                const user = await prisma.user.findUnique({
                  where: { email: body.email },
                });
                if (user && !user.isActive) {
                  // 🛡️ Log Suspended Login Attempt
                  await createActivityEntry({
                    userId: Number(user.id),
                    type: "LOGIN",
                    description: `Suspended user ${body.email} tried to log in`,
                  });

                  throw new APIError("FORBIDDEN", {
                    message: "account is suspended please contact admin",
                  });
                }
              }
            },
          },
          {
            matcher: (ctx) => !!ctx.path && ctx.path.includes("/sign-out"),
            handler: async (ctx) => {
              if (ctx.request) {
                const session = await auth.api.getSession({ headers: ctx.request.headers });
                if (session?.user?.id) {
                  // 🛡️ Log Successful Logout
                  await createActivityEntry({
                    userId: Number(session.user.id),
                    type: "LOGOUT",
                    description: `User ${session.user.email} logged out`,
                  });
                }
              }
            },
          },
        ],
      },
    },
    organization({
      schema: {
        organization: {
          modelName: "Organisation",
          additionalFields: {
            isActive: { type: "boolean", defaultValue: true, required: false },
            description: { type: "string", required: false },
            createdBy: { type: "number", required: false },
            updatedBy: { type: "number", required: false },
          },
        },
        member: {
          modelName: "OrganisationMember",
          additionalFields: {
            isActive: { type: "boolean", defaultValue: true, required: false },
            createdBy: { type: "number", required: false },
            updatedBy: { type: "number", required: false },
          },
        },
        invitation: {
          modelName: "OrganisationInvitation",
          additionalFields: {
            isActive: { type: "boolean", defaultValue: true, required: false },
            createdBy: { type: "number", required: false },
            updatedBy: { type: "number", required: false },
          },
        },
        team: {
          modelName: "OrganisationTeam",
          additionalFields: {
            isActive: { type: "boolean", defaultValue: true, required: false },
            createdBy: { type: "number", required: false },
            updatedBy: { type: "number", required: false },
          },
        },
        teamMember: {
          modelName: "OrganisationTeamMember",
          additionalFields: {
            isActive: { type: "boolean", defaultValue: true, required: false },
            createdBy: { type: "number", required: false },
            updatedBy: { type: "number", required: false },
          },
        },
      },
      teams: {
        enabled: true,
      },
      dynamicAccessControl: {
        enabled: true,
      },
      sendInvitationEmail: async (data) => {
        // 🔒 Industrial Invitation Loop
        const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `Industrial Invitation: Join ${data.organization.name}`,
          text: `You have been invited to join ${data.organization.name}. Accept here: ${inviteLink}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e293b; margin-top: 0;">Industrial Invitation</h2>
              <p style="color: #475569; line-height: 1.6;">
                <strong>${data.inviter.user.name}</strong> has invited you to join the <strong>${data.organization.name}</strong> workspace.
              </p>
              <div style="margin: 32px 0;">
                <a href="${inviteLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                This invitation will expire in 48 hours.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  advanced: {
    database: {
      generateId: "serial",
    },
  },
});
