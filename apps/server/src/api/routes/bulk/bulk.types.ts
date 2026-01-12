// import { z } from "@hono/zod-openapi";

// // Bulk Import Activities
// export const bulkImportActivitiesSchema = z.object({
//   projectType: z.enum(['HIV', 'Malaria', 'TB']),
//   facilityType: z.enum(['hospital', 'health_center']),
//   activities: z.array(z.object({
//     categoryId: z.number().int(),
//     code: z.string().optional(),
//     name: z.string().max(300),
//     description: z.string().optional(),
//     activityType: z.string().max(100).optional(),
//     displayOrder: z.number().int(),
//     isTotalRow: z.boolean().default(false),
//     isAnnualOnly: z.boolean().default(false),
//     fieldMappings: z.record(z.string(), z.any()).optional(),
//     computationRules: z.record(z.string(), z.any()).optional(),
//     validationRules: z.record(z.string(), z.any()).optional(),
//     metadata: z.record(z.string(), z.any()).optional(),
//     isActive: z.boolean().default(true)
//   })),
//   options: z.object({
//     skipDuplicates: z.boolean().default(false),
//     updateExisting: z.boolean().default(false),
//     validateBeforeImport: z.boolean().default(true)
//   })
// });

// export const bulkImportResultSchema = z.object({
//   success: z.boolean(),
//   imported: z.number().int(),
//   skipped: z.number().int(),
//   updated: z.number().int(),
//   failed: z.number().int(),
//   errors: z.array(z.object({
//     index: z.number().int(),
//     activity: z.string(),
//     error: z.string()
//   })).optional()
// });

// // Bulk Export
// export const bulkExportDataSchema = z.object({
//   entityType: z.enum(['activities', 'categories', 'schemas', 'reports', 'configurations']),
//   filters: z.object({
//     projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
//     facilityType: z.enum(['hospital', 'health_center']).optional(),
//     isActive: z.boolean().optional(),
//     fromDate: z.string().optional(),
//     toDate: z.string().optional()
//   }).optional(),
//   format: z.enum(['json', 'csv', 'excel']).default('json')
// });

// // Backup Configurations
// export const backupConfigurationsSchema = z.object({
//   includeSchemas: z.boolean().default(true),
//   includeCategories: z.boolean().default(true),
//   includeActivities: z.boolean().default(true),
//   includeMappings: z.boolean().default(true),
//   includeTemplates: z.boolean().default(true),
//   includeSystemConfig: z.boolean().default(true),
//   compress: z.boolean().default(true)
// });

// export const backupResultSchema = z.object({
//   success: z.boolean(),
//   backupId: z.string(),
//   fileName: z.string(),
//   size: z.number(),
//   entities: z.record(z.string(), z.any()),
//   createdAt: z.string()
// });


import { z } from "@hono/zod-openapi";

// Export format enums
export const exportFormatEnum = z.enum(['pdf', 'excel', 'csv', 'json', 'xml']);
export const templateTypeEnum = z.enum(['default', 'detailed', 'summary', 'comparative', 'custom']);
export const exportScopeEnum = z.enum(['single_report', 'multiple_reports', 'bulk_data', 'system_backup']);
export const exportStatusEnum = z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']);

// Base export schemas
export const exportRequestSchema = z.object({
  format: exportFormatEnum,
  templateType: templateTypeEnum.default('default'),
  includeMetadata: z.boolean().default(true),
  includeValidation: z.boolean().default(false),
  includeHistory: z.boolean().default(false),
  includeComparatives: z.boolean().default(false),
  customFields: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

export const exportResponseSchema = z.object({
  exportId: z.string(),
  format: exportFormatEnum,
  filename: z.string(),
  fileSize: z.number(),
  downloadUrl: z.string(),
  expiresAt: z.string(),
  metadata: z.object({
    recordsCount: z.number(),
    generatedAt: z.string(),
    generatedBy: z.number(),
    processingTime: z.number(),
    checksum: z.string(),
  }),
});

// Bulk export schemas
export const bulkExportRequestSchema = z.object({
  exportType: z.enum([
    'financial_reports',
    'statement_templates', 
    'form_schemas',
    'activities',
    'event_mappings',
    'system_configurations',
    'audit_logs',
  ]),
  format: exportFormatEnum,
  filters: z.object({
    dateRange: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }).optional(),
    facilityIds: z.array(z.number().int()).optional(),
    projectIds: z.array(z.number().int()).optional(),
    status: z.array(z.string()).optional(),
    reportingPeriodIds: z.array(z.number().int()).optional(),
  }).optional(),
  includeRelations: z.boolean().default(true),
  includeInactive: z.boolean().default(false),
  compression: z.boolean().default(true),
  splitFiles: z.boolean().default(false),
  maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
});

export const bulkExportResponseSchema = z.object({
  exportId: z.string(),
  status: exportStatusEnum,
  progress: z.object({
    current: z.number(),
    total: z.number(),
    percentage: z.number(),
    stage: z.string(),
  }),
  files: z.array(z.object({
    filename: z.string(),
    format: exportFormatEnum,
    fileSize: z.number(),
    recordCount: z.number(),
    downloadUrl: z.string(),
  })).optional(),
  metadata: z.object({
    totalRecords: z.number(),
    totalFiles: z.number(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    estimatedTimeRemaining: z.number().optional(),
  }),
});

// Migration export schemas
export const migrationExportRequestSchema = z.object({
  sourceSystem: z.string(),
  targetFormat: exportFormatEnum,
  migrationScope: z.enum(['full_system', 'selective_data', 'configuration_only']),
  dataMapping: z.record(z.string(), z.any()).optional(),
  transformationRules: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    transformation: z.string(),
  })).optional(),
  validateData: z.boolean().default(true),
  createBackup: z.boolean().default(true),
});

// Template management schemas
export const exportTemplateSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  templateType: templateTypeEnum,
  format: exportFormatEnum,
  scope: exportScopeEnum,
  configuration: z.record(z.string(), z.any()),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  createdBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const exportTemplateListRequestSchema = z.object({
  templateType: z.string().optional(),
  format: z.string().optional(),
  isPublic: z.boolean().optional(),
  createdBy: z.number().int().optional(),
  page: z.number().int().default(1),
  limit: z.number().int().default(20),
});

export const exportTemplateListResponseSchema = z.object({
  templates: z.array(exportTemplateSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Export job status schemas
export const exportJobStatusSchema = z.object({
  exportId: z.string(),
  status: exportStatusEnum,
  progress: z.object({
    current: z.number(),
    total: z.number(),
    percentage: z.number(),
    stage: z.string(),
    message: z.string().optional(),
  }),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  estimatedTimeRemaining: z.number().optional(),
  error: z.string().optional(),
});

