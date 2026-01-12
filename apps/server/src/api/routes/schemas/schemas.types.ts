import { z } from "@hono/zod-openapi";

export const moduleTypeEnum = z.enum(['planning', 'execution', 'reporting']);
export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);
export const facilityTypeEnum = z.enum(['hospital', 'health_center']);

// Form Schema Types
export const insertFormSchemaSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  projectType: projectTypeEnum.optional(),
  facilityType: facilityTypeEnum.optional(),
  moduleType: moduleTypeEnum,
  schema: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const selectFormSchemaSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.string(),
  projectType: projectTypeEnum.nullable(),
  facilityType: facilityTypeEnum.nullable(),
  moduleType: moduleTypeEnum,
  isActive: z.boolean(),
  schema: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchFormSchemaSchema = insertFormSchemaSchema.partial();