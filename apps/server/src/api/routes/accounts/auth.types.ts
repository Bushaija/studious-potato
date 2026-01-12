import { z } from "@hono/zod-openapi"

// Auth response schemas
export const authResponseSchema = z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.enum(['accountant', 'admin', 'program_manager', 'daf', 'dg']),
      facilityId: z.number().nullable(),
      permissions: z.array(z.string()).default([]),
      projectAccess: z.array(z.number()).default([]),
      isActive: z.boolean(),
      lastLoginAt: z.string().nullable(),
    }),
    session: z.object({
      id: z.string(),
      token: z.string(),
      expiresAt: z.string(),
    }),
  })
  
export const errorSchema = z.object({
    message: z.string(),
    code: z.string().optional(),
    errors: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  })

// Route types for TypeScript inference
export type SignUpRoute = typeof import("./auth.routes").signUp
export type BanUserRoute = typeof import("./auth.routes").banUser
export type UnbanUserRoute = typeof import("./auth.routes").unbanUser
export type SignInRoute = typeof import("./auth.routes").signIn
export type SignOutRoute = typeof import("./auth.routes").signOut
export type GetSessionRoute = typeof import("./auth.routes").getSession
export type UpdateProfileRoute = typeof import("./auth.routes").updateProfile
export type ForgotPasswordRoute = typeof import("./auth.routes").forgotPassword
export type ResetPasswordRoute = typeof import("./auth.routes").resetPassword
export type VerifyEmailRoute = typeof import("./auth.routes").verifyEmail