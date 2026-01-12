import { z } from "@hono/zod-openapi";

export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);
export const facilityTypeEnum = z.enum(['hospital', 'health_center']);
export const moduleTypeEnum = z.enum(['planning', 'execution']);

// Activity Types
export const insertActivitySchema = z.object({
  categoryId: z.number().int(),
  moduleType: moduleTypeEnum.optional(),
  projectType: projectTypeEnum.optional(),
  facilityType: facilityTypeEnum.optional(),
  code: z.string().max(100).optional(),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  activityType: z.string().max(100).optional(),
  displayOrder: z.number().int(),
  isTotalRow: z.boolean().default(false),
  isAnnualOnly: z.boolean().default(false),
  fieldMappings: z.record(z.string(), z.any()).optional(),
  computationRules: z.record(z.string(), z.any()).optional(),
  validationRules: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const selectActivitySchema = z.object({
  id: z.number().int(),
  categoryId: z.number().int(),
  moduleType: moduleTypeEnum.nullable(),
  projectType: projectTypeEnum.nullable(),
  facilityType: facilityTypeEnum.nullable(),
  code: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  activityType: z.string().nullable(),
  displayOrder: z.number().int(),
  isTotalRow: z.boolean(),
  isAnnualOnly: z.boolean(),
  fieldMappings: z.record(z.string(), z.any()).nullable(),
  computationRules: z.record(z.string(), z.any()).nullable(),
  validationRules: z.record(z.string(), z.any()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchActivitySchema = insertActivitySchema.partial();

export const bulkInsertActivitySchema = z.object({
  activities: z.array(insertActivitySchema),
});

export const reorderActivitiesSchema = z.object({
  activityOrders: z.array(z.object({
    id: z.number().int(),
    displayOrder: z.number().int(),
  })),
});