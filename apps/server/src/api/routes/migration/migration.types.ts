import { z } from "@hono/zod-openapi";

// Base migration types
export const migrationStatus = z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
export const migrationType = z.enum(['normalize_legacy_reports', 'schema_migration', 'data_transformation', 'bulk_import']);

// Legacy data normalization schemas
export const normalizeLegacyReportsRequestSchema = z.object({
  legacyData: z.record(z.string(), z.any()).describe("Legacy financial report data in original format"),
  targetSchemaId: z.number().int().describe("ID of the target form schema to normalize to"),
  projectId: z.number().int().describe("Project ID for the migrated data"),
  facilityId: z.number().int().describe("Facility ID for the migrated data"),
  reportingPeriodId: z.number().int().optional().describe("Reporting period ID if applicable"),
  mappingRules: z.record(z.string(), z.any()).optional().describe("Custom field mapping rules"),
  validationMode: z.enum(['strict', 'lenient', 'skip']).default('strict').describe("Validation strictness level"),
  preserveOriginal: z.boolean().default(true).describe("Whether to preserve original data for rollback"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional migration metadata")
});

export const normalizeLegacyReportsResponseSchema = z.object({
  migrationId: z.string().describe("Unique migration identifier"),
  status: migrationStatus,
  normalizedData: z.record(z.string(), z.any()).optional().describe("Normalized data structure"),
  validationResults: z.object({
    isValid: z.boolean(),
    errors: z.array(z.object({
      field: z.string(),
      message: z.string(),
      severity: z.enum(['error', 'warning', 'info'])
    })),
    warnings: z.array(z.string()),
    summary: z.object({
      totalFields: z.number(),
      validFields: z.number(),
      errorFields: z.number(),
      warningFields: z.number()
    })
  }),
  mappingReport: z.object({
    appliedMappings: z.record(z.string(), z.string()),
    unmappedFields: z.array(z.string()),
    computedFields: z.array(z.string()),
    transformations: z.array(z.object({
      field: z.string(),
      originalValue: z.any(),
      transformedValue: z.any(),
      rule: z.string()
    }))
  }).optional(),
  createdAt: z.string().datetime(),
  estimatedCompletionTime: z.string().optional()
});

// Migration validation schemas
export const validateMigrationRequestSchema = z.object({
  migrationId: z.string().describe("Migration ID to validate"),
  validationType: z.enum(['structure', 'data', 'references', 'business_rules']).default('structure'),
  includeWarnings: z.boolean().default(true),
  customValidators: z.array(z.string()).optional().describe("Additional validation rule names to apply")
});

export const validationResultSchema = z.object({
  migrationId: z.string(),
  isValid: z.boolean(),
  validationType: z.string(),
  results: z.object({
    structureValidation: z.object({
      isValid: z.boolean(),
      missingFields: z.array(z.string()),
      extraFields: z.array(z.string()),
      typeErrors: z.array(z.object({
        field: z.string(),
        expectedType: z.string(),
        actualType: z.string()
      }))
    }).optional(),
    dataValidation: z.object({
      isValid: z.boolean(),
      errors: z.array(z.object({
        field: z.string(),
        value: z.any(),
        constraint: z.string(),
        message: z.string()
      })),
      warnings: z.array(z.string())
    }).optional(),
    referenceValidation: z.object({
      isValid: z.boolean(),
      brokenReferences: z.array(z.object({
        field: z.string(),
        value: z.any(),
        targetTable: z.string(),
        message: z.string()
      }))
    }).optional(),
    businessRuleValidation: z.object({
      isValid: z.boolean(),
      violations: z.array(z.object({
        rule: z.string(),
        description: z.string(),
        affectedFields: z.array(z.string()),
        severity: z.enum(['error', 'warning'])
      }))
    }).optional()
  }),
  summary: z.object({
    totalChecks: z.number(),
    passedChecks: z.number(),
    failedChecks: z.number(),
    warningCount: z.number()
  }),
  recommendations: z.array(z.string()).optional(),
  validatedAt: z.string().datetime()
});

// Migration status schemas
export const migrationStatusResponseSchema = z.object({
  id: z.string(),
  type: migrationType,
  status: migrationStatus,
  progress: z.number().min(0).max(100).describe("Progress percentage"),
  currentStep: z.string().optional(),
  totalSteps: z.number().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedTimeRemaining: z.number().optional().describe("Seconds remaining"),
  statistics: z.object({
    recordsProcessed: z.number(),
    recordsTotal: z.number(),
    recordsSuccessful: z.number(),
    recordsFailed: z.number(),
    recordsSkipped: z.number()
  }).optional(),
  errors: z.array(z.object({
    timestamp: z.string().datetime(),
    error: z.string(),
    context: z.record(z.string(), z.any()).optional()
  })).optional(),
  warnings: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdBy: z.number().optional(),
  updatedAt: z.string().datetime()
});

// Schema migration schemas
export const schemaMigrationRequestSchema = z.object({
  sourceSchemaId: z.number().int().describe("Source form schema ID"),
  targetSchemaId: z.number().int().describe("Target form schema ID"),
  entityIds: z.array(z.number()).optional().describe("Specific entity IDs to migrate (empty = all)"),
  fieldMappings: z.record(z.string(), z.string()).optional().describe("Manual field mappings"),
  transformationRules: z.array(z.object({
    sourceField: z.string(),
    targetField: z.string(),
    transformFunction: z.string(),
    parameters: z.record(z.string(), z.any()).optional()
  })).optional(),
  options: z.object({
    preserveOriginal: z.boolean().default(true),
    validateAfterMigration: z.boolean().default(true),
    allowPartialMigration: z.boolean().default(false),
    batchSize: z.number().default(100)
  }).optional()
});

// Bulk import schemas
export const bulkImportRequestSchema = z.object({
  importType: z.enum(['csv', 'excel', 'json', 'xml']),
  schemaId: z.number().int().describe("Target form schema ID"),
  data: z.string().describe("Base64 encoded file data or direct JSON string"),
  options: z.object({
    hasHeaders: z.boolean().default(true),
    delimiter: z.string().default(','),
    encoding: z.string().default('utf-8'),
    skipValidation: z.boolean().default(false),
    allowPartialImport: z.boolean().default(false),
    updateExisting: z.boolean().default(false)
  }).optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  defaultValues: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Migration history and rollback schemas
export const migrationHistoryResponseSchema = z.object({
  migrations: z.array(z.object({
    id: z.string(),
    type: migrationType,
    status: migrationStatus,
    description: z.string(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    createdBy: z.object({
      id: z.number(),
      name: z.string(),
      email: z.string()
    }).optional(),
    statistics: z.object({
      recordsProcessed: z.number(),
      recordsSuccessful: z.number(),
      recordsFailed: z.number()
    }).optional(),
    canRollback: z.boolean()
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  })
});

export const rollbackMigrationRequestSchema = z.object({
  migrationId: z.string(),
  rollbackReason: z.string().optional(),
  preserveChanges: z.boolean().default(false).describe("Whether to preserve any manual changes made after migration")
});

// Data transformation schemas
export const dataTransformationRequestSchema = z.object({
  sourceData: z.array(z.record(z.string(), z.any())),
  transformationRules: z.array(z.object({
    type: z.enum(['field_rename', 'value_transform', 'field_merge', 'field_split', 'conditional_transform']),
    config: z.record(z.string(), z.any())
  })),
  targetSchema: z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
      validation: z.record(z.string(), z.any()).optional()
    }))
  }).optional(),
  options: z.object({
    validateOutput: z.boolean().default(true),
    preserveMetadata: z.boolean().default(true),
    generateReport: z.boolean().default(true)
  }).optional()
});

// Export type aliases for easier imports
export type NormalizeLegacyReportsRequest = z.infer<typeof normalizeLegacyReportsRequestSchema>;
export type NormalizeLegacyReportsResponse = z.infer<typeof normalizeLegacyReportsResponseSchema>;
export type ValidateMigrationRequest = z.infer<typeof validateMigrationRequestSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type MigrationStatusResponse = z.infer<typeof migrationStatusResponseSchema>;
export type SchemaMigrationRequest = z.infer<typeof schemaMigrationRequestSchema>;
export type BulkImportRequest = z.infer<typeof bulkImportRequestSchema>;
export type MigrationHistoryResponse = z.infer<typeof migrationHistoryResponseSchema>;
export type RollbackMigrationRequest = z.infer<typeof rollbackMigrationRequestSchema>;
export type DataTransformationRequest = z.infer<typeof dataTransformationRequestSchema>;