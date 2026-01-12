import { z } from "@hono/zod-openapi";

// Base schemas for statement templates
export const insertStatementTemplateSchema = z.object({
  statementCode: z.string().min(1).max(50),
  statementName: z.string().min(1).max(200),
  lineItem: z.string().min(1).max(300),
  lineCode: z.string().max(50).optional(),
  parentLineId: z.number().int().optional(),
  displayOrder: z.number().int().min(1),
  level: z.number().int().min(1).max(10).default(1),
  isTotalLine: z.boolean().default(false),
  isSubtotalLine: z.boolean().default(false),
  eventMappings: z.record(z.string(), z.any()).default({}),
  calculationFormula: z.string().optional(),
  aggregationMethod: z.string().max(50).default('SUM'),
  displayConditions: z.record(z.string(), z.any()).default({}),
  formatRules: z.record(z.string(), z.any()).default({}),
  metadata: z.record(z.string(), z.any()).default({}),
  isActive: z.boolean().default(true),
});

export const selectStatementTemplateSchema = z.object({
  id: z.number().int(),
  statementCode: z.string(),
  statementName: z.string(),
  lineItem: z.string(),
  lineCode: z.string().nullable(),
  parentLineId: z.number().int().nullable(),
  displayOrder: z.number().int(),
  level: z.number().int(),
  isTotalLine: z.boolean(),
  isSubtotalLine: z.boolean(),
  eventMappings: z.record(z.string(), z.any()),
  calculationFormula: z.string().nullable(),
  aggregationMethod: z.string(),
  displayConditions: z.record(z.string(), z.any()),
  formatRules: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Hierarchical template with children
export const hierarchicalStatementTemplateSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    statementCode: z.string(),
    statementName: z.string(),
    lineItem: z.string(),
    lineCode: z.string().nullable(),
    parentLineId: z.number().int().nullable(),
    displayOrder: z.number().int(),
    level: z.number().int(),
    isTotalLine: z.boolean(),
    isSubtotalLine: z.boolean(),
    eventMappings: z.record(z.string(), z.any()),
    calculationFormula: z.string().nullable(),
    aggregationMethod: z.string(),
    displayConditions: z.record(z.string(), z.any()),
    formatRules: z.record(z.string(), z.any()),
    metadata: z.record(z.string(), z.any()),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    children: z.array(hierarchicalStatementTemplateSchema).optional(),
  })
);

export const patchStatementTemplateSchema = insertStatementTemplateSchema.partial();

// Query parameters for filtering
export const statementTemplatesQuerySchema = z.object({
  statementCode: z.string()
    .regex(/^[A-Z_]+$/, "Statement code must contain only uppercase letters and underscores")
    .min(3)
    .max(50),
  isActive: z.string().optional().transform((val) => val === 'true' ? true : val === 'false' ? false : undefined),
  level: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  parentLineId: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  includeHierarchy: z.string().optional().transform((val) => val === 'true'),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 100),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
});

// Response schemas
export const statementTemplatesListSchema = z.object({
  data: z.array(z.union([selectStatementTemplateSchema, hierarchicalStatementTemplateSchema])),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const statementStructureSchema = z.object({
  statementCode: z.string(),
  statementName: z.string(),
  totalLines: z.number(),
  maxLevel: z.number(),
  hasCalculatedLines: z.boolean(),
  templates: z.array(hierarchicalStatementTemplateSchema),
});

export const templateValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    lineId: z.number().optional(),
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
    lineId: z.number().optional(),
  })),
});

// Bulk operations
export const bulkCreateTemplatesSchema = z.object({
  templates: z.array(insertStatementTemplateSchema),
  validateOnly: z.boolean().default(false),
});

export const bulkUpdateTemplatesSchema = z.object({
  updates: z.array(z.object({
    id: z.number().int(),
    data: patchStatementTemplateSchema,
  })),
});

export const reorderTemplatesSchema = z.object({
  statementCode: z.string(),
  reorderedItems: z.array(z.object({
    id: z.number().int(),
    displayOrder: z.number().int(),
    level: z.number().int().optional(),
    parentLineId: z.number().int().optional(),
  })),
});

// Statement codes enum for validation
export const statementCodesSchema = z.object({
  codes: z.array(z.object({
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
  })),
});

// Type exports
export type InsertStatementTemplate = z.infer<typeof insertStatementTemplateSchema>;
export type SelectStatementTemplate = z.infer<typeof selectStatementTemplateSchema>;
export type HierarchicalStatementTemplate = z.infer<typeof hierarchicalStatementTemplateSchema>;
export type PatchStatementTemplate = z.infer<typeof patchStatementTemplateSchema>;
export type StatementTemplatesQuery = z.infer<typeof statementTemplatesQuerySchema>;
export type StatementTemplatesListResponse = z.infer<typeof statementTemplatesListSchema>;
export type StatementStructure = z.infer<typeof statementStructureSchema>;
export type TemplateValidation = z.infer<typeof templateValidationSchema>;
export type BulkCreateTemplates = z.infer<typeof bulkCreateTemplatesSchema>;
export type BulkUpdateTemplates = z.infer<typeof bulkUpdateTemplatesSchema>;
export type ReorderTemplates = z.infer<typeof reorderTemplatesSchema>;
export type StatementCodes = z.infer<typeof statementCodesSchema>;