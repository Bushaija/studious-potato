import { z } from "@hono/zod-openapi";

export const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    role: z.enum(['accountant', 'admin', 'program_manager', 'daf', 'dg']),
    facilityId: z.number().nullable(),
    permissions: z.string().nullable(),
    projectAccess: z.string().nullable(),
    configAccess: z.string().nullable(),
    isActive: z.boolean(),
    mustChangePassword: z.boolean(),
    banned: z.boolean(),
    banReason: z.string().nullable(),
    banExpires: z.string().nullable(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.number().nullable(),
  })
  
export const errorSchema = z.object({
    message: z.string(),
    errors: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  })