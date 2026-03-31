import { betterAuth, APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getVerificationEmailTemplate, getResetPasswordEmailTemplate } from "./email-templates";
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
        after: async (user) => {
          if (user.isActive === false) {
            await prisma.session.deleteMany({
              where: { userId: Number(user.id) },
            });
          }
        },
      },
    },
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
      id: "user-status",
      hooks: {
        before: [
          {
            matcher: (ctx) => !!ctx.path && ctx.path.endsWith("/sign-in/email"),
            handler: async (ctx) => {
              const body = ctx.body as unknown as { email?: string };
              if (body?.email) {
                const user = await prisma.user.findUnique({
                  where: { email: body.email },
                });
                if (user && !user.isActive) {
                  console.warn(`Suspended user login attempt: ${body.email}`);
                  throw new APIError("FORBIDDEN", {
                    message: "account is suspended please contact admin",
                  });
                }
              }
            },
          },
        ],
      },
    },
  ],
  advanced: {
    database: {
      generateId: "serial",
    },
  },
});
