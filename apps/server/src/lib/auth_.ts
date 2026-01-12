import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendVerificationEmail, sendAccountCreationEmail, sendAccountSetupEmail } from "./email.service";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth";

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || `http://localhost:9999/api/auth`,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false, // Don't auto-login after password setup
    disableSignUp: false,
    sendResetPassword: async ({ user, url, token }) => {
      const urlObj = new URL(url);
    
      const resetToken = urlObj.searchParams.get('token') || token;

      // Check if this is a new user (mustChangePassword = true)
      const dbUser = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });

      if (dbUser?.mustChangePassword) {
        // Send account setup email for new users
        const setupUrl = `${process.env.FRONTEND_URL}/setup-account?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
        
        void sendAccountSetupEmail({
          email: user.email,
          name: user.name || user.email,
          setupLink: setupUrl,
          adminName: 'System Administrator',
          role: dbUser.role || 'accountant',
        });
      } else {
        // Send regular password reset email for existing users
        void sendVerificationEmail({
          email: user.email,
          otp: resetToken,
          type: 'forget-password',
        });
      }
    },

    onPasswordReset: async ({ user }) => {
      console.log(`[Password Reset] Password successfully reset for user: ${user.email}`);
      
      // Mark email as verified when password is set during account setup
      await db
        .update(schema.users)
        .set({
          emailVerified: true,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, parseInt(user.id)));
    },
  },

  // Email verification is handled through the password reset flow
  // The sendResetPassword callback sends the account setup email with a valid token

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "accountant",
        required: true,
      },
      facilityId: {
        type: "number",
        required: false,
      },
      permissions: {
        type: "string",
        required: false,
      },
      projectAccess: {
        type: "string",
        required: false,
      },
      configAccess: {
        type: "string",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
      createdBy: {
        type: "number",
        required: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  plugins: [
    admin({
      adminRoles: ["admin", "superadmin"],
      adminEmails: process.env.ADMIN_EMAILS?.split(",") || [],
    }),
    organization({
      allowUserToCreateOrganization: false,
      creatorRole: "owner",
      sendInvitationEmail: async ({ invitation, inviter, organization }) => {
        // Check inviter permissions
        if (!["admin", "superadmin"].includes(inviter.role)) {
          throw new Error("Only admins can send invitations");
        }

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:2222'}/invitation?invitationId=${invitation.id}&organization=${organization.name}`;

        await sendAccountCreationEmail({
          email: invitation.email,
          inviterEmail: inviter.user.email,
          organizationName: organization.name,
          inviteLink,
          temporaryPassword: "TEMP_PASSWORD_PLACEHOLDER", // Generate proper temp password
        });
      },
    }),

    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendVerificationEmail({ email, otp, type });
      },
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
    }),
  ],

  trustedOrigins: [
    "http://localhost:2222",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://197.243.110.153",
    "http://197.243.110.153/rina",
    "http://197.243.110.153/api"
  ],

  advanced: {
    // Only use secure cookies if explicitly enabled (requires HTTPS)
    useSecureCookies: process.env.USE_SECURE_COOKIES === "true",
    crossSubDomainCookies: {
      enabled: false, // Disable unless you need cross-subdomain support
      domain: process.env.COOKIE_DOMAIN,
    },
    defaultCookieAttributes: {
      // Use 'lax' for same-origin requests (works without HTTPS)
      sameSite: "lax",
      path: "/",
    },
    database: {
      generateId: false,
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          const headers = context?.headers ?? new Headers();
          const session = await auth.api.getSession({ headers });

          // Read custom headers for additional user data
          const customRole = headers.get('x-signup-role');
          const customFacilityId = headers.get('x-signup-facility-id');
          const customPermissions = headers.get('x-signup-permissions');
          const customProjectAccess = headers.get('x-signup-project-access');
          const customIsActive = headers.get('x-signup-is-active');

          // Parse custom data
          let permissions: string[] = [];
          let projectAccess: number[] = [];
          
          try {
            if (customPermissions) permissions = JSON.parse(customPermissions);
            if (customProjectAccess) projectAccess = JSON.parse(customProjectAccess);
          } catch (e) {
            console.error('Failed to parse custom headers:', e);
          }

          // Assign admin role based on email if it's in admin emails
          let userRole = customRole || user.role || "accountant";
          if (process.env.ADMIN_EMAILS?.split(",").includes(user.email)) {
            userRole = "admin";
          }

          const facilityId = customFacilityId ? parseInt(customFacilityId) : user.facilityId;
          const isActive = customIsActive ? customIsActive === 'true' : (user.isActive !== undefined ? user.isActive : true);

          return {
            data: {
              ...user,
              role: userRole,
              facilityId: facilityId || null,
              isActive,
              permissions: permissions.length > 0 ? permissions : (user.permissions || []),
              projectAccess: projectAccess.length > 0 ? projectAccess : (user.projectAccess || []),
              configAccess: user.configAccess || "{}",
              createdBy: session?.user?.id ? parseInt(session.user.id) : null,
              mustChangePassword: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          };
        },

        after: async (user) => {
          // Handle first user becoming superadmin
          const userCount = await db.$count(schema.users);

          if (userCount === 1) {
            await db
              .update(schema.users)
              .set({
                role: "admin",
                permissions: ["superadmin", "all_facilities"],
                mustChangePassword: false,
                emailVerified: true,
                updatedAt: new Date(),
              })
              .where(eq(schema.users.id, parseInt(user.id)));
            
            console.log(`First user created and promoted to superadmin: ${user.email}`);
            return;
          }

          // For non-first users, send password reset email for account setup
          try {
            console.log(`[Auth Hook] User created: ${user.email}, sending setup email`);
            
            // Clean up any existing verification tokens for this email
            const deletedTokens = await db.delete(schema.verification)
              .where(eq(schema.verification.identifier, user.email))
              .returning();
            
            if (deletedTokens.length > 0) {
              console.log(`[Auth Hook] Cleaned up ${deletedTokens.length} old verification token(s) for ${user.email}`);
            }
            
            // Small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Use Better Auth's forgetPassword to generate a reset token
            await auth.api.forgetPassword({
              body: {
                email: user.email,
                redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:2222'}/setup-account`,
              },
            });

            // Small delay to ensure token is created
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify token was created
            const verificationToken = await db.query.verification.findFirst({
              where: eq(schema.verification.identifier, user.email),
            });

            if (verificationToken) {
              console.log(`[Auth Hook] Setup email sent to: ${user.email}, token expires at: ${verificationToken.expiresAt}`);
            } else {
              console.error(`[Auth Hook] WARNING: No verification token found for ${user.email} after forgetPassword call`);
            }
          } catch (error) {
            console.error(`[Auth Hook] Failed to send setup email to ${user.email}:`, error);
            // Don't throw - user is created, just email failed
          }
        },
      },
      update: {
        before: async (user) => ({
          data: {
            ...user,
            updatedAt: new Date(),
          }
        }),
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Check user status before creating session
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, parseInt(session.userId)),
          });

          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "user not found",
              code: "USER_NOT_FOUND"
            });
          }

          // Check if user is banned (better-auth handles this automatically)
          if (user.banned) {
            throw new APIError("FORBIDDEN", {
              message: user.banReason || "Account is banned",
              code: "ACCOUNT_BANNED",
            });
          }

          if (!user.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "Account is deactivated",
              code: "ACCOUNT_INACTIVE",
            });
          }


          return { data: session };
        },

        after: async (session) => {
          // Update last login time
          await db
            .update(schema.users)
            .set({
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.users.id, parseInt(session.userId)));
        },
      },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100, // Reasonable limit
    storage: "memory",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;