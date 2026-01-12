import { z } from "@hono/zod-openapi";

// Base event mapping schemas
export const insertEventMappingSchema = z.object({
  eventId: z.number().int(),
  activityId: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']),
  facilityType: z.enum(['hospital', 'health_center']),
  mappingType: z.enum(['DIRECT', 'COMPUTED', 'AGGREGATED']).default('DIRECT'),
  mappingFormula: z.string().optional(),
  mappingRatio: z.number().default(1.0),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectEventMappingSchema = z.object({
  id: z.number().int(),
  eventId: z.number().int(),
  activityId: z.number().int().nullable(),
  categoryId: z.number().int().nullable(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']),
  facilityType: z.enum(['hospital', 'health_center']),
  mappingType: z.enum(['DIRECT', 'COMPUTED', 'AGGREGATED']),
  mappingFormula: z.string().nullable(),
  mappingRatio: z.number(),
  isActive: z.boolean(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchEventMappingSchema = insertEventMappingSchema.partial();

// Event schema
export const selectEventSchema = z.object({
  id: z.number().int(),
  noteNumber: z.number().int(),
  code: z.string(),
  description: z.string(),
  statementCodes: z.array(z.string()),
  eventType: z.enum(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY']),
  isCurrent: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Bulk mapping operations
export const bulkUpdateMappingsSchema = z.object({
  mappings: z.array(z.object({
    id: z.number().int().optional(),
    eventId: z.number().int(),
    activityId: z.number().int().optional(),
    categoryId: z.number().int().optional(),
    mappingType: z.enum(['DIRECT', 'COMPUTED', 'AGGREGATED']),
    mappingFormula: z.string().optional(),
    mappingRatio: z.number().default(1.0),
  })),
  projectType: z.enum(['HIV', 'Malaria', 'TB']),
  facilityType: z.enum(['hospital', 'health_center']),
});

// Mapping validation schema
export const validateMappingSchema = z.object({
  eventId: z.number().int(),
  mappingFormula: z.string(),
  testData: z.record(z.string(), z.any()).optional(),
});

// Query parameters
export const eventMappingListQuerySchema = z.object({
  eventId: z.number().int().optional(),
  activityId: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  mappingType: z.enum(['DIRECT', 'COMPUTED', 'AGGREGATED']).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type InsertEventMapping = z.infer<typeof insertEventMappingSchema>;
export type SelectEventMapping = z.infer<typeof selectEventMappingSchema>;
export type PatchEventMapping = z.infer<typeof patchEventMappingSchema>;
export type SelectEvent = z.infer<typeof selectEventSchema>;
export type BulkUpdateMappings = z.infer<typeof bulkUpdateMappingsSchema>;
export type EventMappingListQuery = z.infer<typeof eventMappingListQuerySchema>;