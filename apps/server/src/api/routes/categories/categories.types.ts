import { z } from "@hono/zod-openapi";

export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);
export const facilityTypeEnum = z.enum(['hospital', 'health_center']);

// Category Types
export const insertCategorySchema = z.object({
  projectType: projectTypeEnum.optional(),
  facilityType: facilityTypeEnum.optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  displayOrder: z.number().int(),
  parentCategoryId: z.number().int().optional(),
  isComputed: z.boolean().default(false),
  computationFormula: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const selectCategorySchema = z.object({
  id: z.number().int(),
  projectType: projectTypeEnum.nullable(),
  facilityType: facilityTypeEnum.nullable(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number().int(),
  parentCategoryId: z.number().int().nullable(),
  isComputed: z.boolean(),
  computationFormula: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categoryListQuerySchema = z.object({
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  moduleType: z.enum(['planning', 'execution', 'reporting']).optional(),
  parentCategoryId: z.string().optional(),
  isActive: z.string().optional(),
  includeHierarchy: z.enum(['true', 'false']).default('false'),
  page: z.string().default("1"),
  limit: z.string().default("20"),
});


export const patchCategorySchema = insertCategorySchema.partial();
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;