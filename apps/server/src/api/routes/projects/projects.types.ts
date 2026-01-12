import { z } from "@hono/zod-openapi";

// Related schemas (simplified for reference)
export const facilityRefSchema = z.object({
  id: z.coerce.number().int(),
  name: z.string(),
  facilityType: z.enum(['hospital', 'health_center']),
  districtId: z.coerce.number().int(),
});

export const reportingPeriodRefSchema = z.object({
  id: z.coerce.number().int(),
  year: z.coerce.number().int(),
  periodType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
});

export const userRefSchema = z.object({
  id: z.coerce.number().int(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['accountant', 'admin', 'program_manager', 'daf', 'dg']),
});

// Project schemas
export const insertProjectSchema = z.object({
  name: z.string().max(200),
  status: z.string().max(20).default('ACTIVE'),
  code: z.string().max(10),
  description: z.string().optional(),
  projectType: z.string().max(20),
  // projectType: z.enum(['HIV', 'Malaria', 'TB']),
  // facilityId: z.coerce.number().int(),
  // reportingPeriodId: z.coerce.number().int().optional(),
  // userId: z.coerce.number().int(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectProjectSchema = z.object({
  id: z.coerce.number().int(),
  name: z.string(),
  status: z.string(),
  code: z.string(),
  description: z.string().optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']),
  facilityId: z.coerce.number().int(),
  facility: facilityRefSchema,
  reportingPeriodId: z.coerce.number().int().optional(),
  reportingPeriod: reportingPeriodRefSchema.optional(),
  userId: z.coerce.number().int(),
  user: userRefSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchProjectSchema = insertProjectSchema.partial();

export const projectQuerySchema = z.object({
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  facilityId: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: "facilityId must be a positive number"
    }),
  status: z.string().optional(),
  userId: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: "userId must be a positive number"
    }),
});
