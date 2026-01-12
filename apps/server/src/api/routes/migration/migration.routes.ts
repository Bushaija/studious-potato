import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { 
  normalizeLegacyReportsRequestSchema,
  normalizeLegacyReportsResponseSchema,
  validateMigrationRequestSchema,
  validationResultSchema,
  migrationStatusResponseSchema,
  schemaMigrationRequestSchema,
  bulkImportRequestSchema,
  migrationHistoryResponseSchema,
  rollbackMigrationRequestSchema,
  dataTransformationRequestSchema
} from "./migration.types";
import { notFoundSchema } from "@/api/lib/constants";


const tags = ["migration"];

// Legacy report normalization
export const normalizeLegacyReports = createRoute({
  path: "/migration/normalize-legacy-reports",
  method: "post",
  tags,
  summary: "Normalize legacy financial reports to new schema format",
  description: "Converts legacy financial report data to the new schema-driven format, applying field mappings and validations",
  request: {
    body: jsonContentRequired(
      normalizeLegacyReportsRequestSchema,
      "Legacy report data and normalization configuration"
    )
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      normalizeLegacyReportsResponseSchema,
      "Successfully normalized legacy data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        validationErrors: z.array(z.object({
          field: z.string(),
          message: z.string()
        })).optional()
      }),
      "Invalid request data or validation errors"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({
        message: z.string(),
        migrationId: z.string().optional(),
        errors: z.array(z.string())
      }),
      "Migration failed due to data inconsistencies"
    )
  }
});

// Migration validation
export const validateMigration = createRoute({
  path: "/migration/validate-migration",
  method: "post",
  tags,
  summary: "Validate a migration before or after execution",
  description: "Performs comprehensive validation of migration data including structure, references, and business rules",
  request: {
    body: jsonContentRequired(
      validateMigrationRequestSchema,
      "Migration validation configuration"
    )
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      validationResultSchema,
      "Migration validation results"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Migration not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional()
      }),
      "Invalid validation request"
    )
  }
});

// Get migration status
export const getMigrationStatus = createRoute({
  path: "/migration/status/{id}",
  method: "get",
  tags,
  summary: "Get detailed migration status and progress",
  description: "Retrieves current status, progress, and statistics for a specific migration",
  request: {
    params: z.object({
      id: z.string().describe("Migration ID")
    })
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      migrationStatusResponseSchema,
      "Migration status and progress information"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Migration not found"
    )
  }
});

// Schema migration
export const migrateSchema = createRoute({
  path: "/migration/schema-migration",
  method: "post",
  tags,
  summary: "Migrate data between different schema versions",
  description: "Migrates form data from one schema version to another with field mappings and transformations",
  request: {
    body: jsonContentRequired(
      schemaMigrationRequestSchema,
      "Schema migration configuration"
    )
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      z.object({
        migrationId: z.string(),
        message: z.string(),
        estimatedTime: z.number().optional()
      }),
      "Schema migration initiated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional()
      }),
      "Invalid schema migration request"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        conflictingMigrations: z.array(z.string()).optional()
      }),
      "Conflicting migration in progress"
    )
  }
});

// Bulk import
export const bulkImport = createRoute({
  path: "/migration/bulk-import",
  method: "post",
  tags,
  summary: "Import bulk data from various formats",
  description: "Imports data in bulk from CSV, Excel, JSON, or XML formats into the schema-driven system",
  request: {
    body: jsonContentRequired(
      bulkImportRequestSchema,
      "Bulk import data and configuration"
    )
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      z.object({
        migrationId: z.string(),
        message: z.string(),
        previewData: z.array(z.record(z.string(), z.any())).optional(),
        statistics: z.object({
          totalRecords: z.number(),
          validRecords: z.number(),
          invalidRecords: z.number()
        }).optional()
      }),
      "Bulk import initiated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        formatErrors: z.array(z.string()).optional()
      }),
      "Invalid import data or format"
    ),
    [HttpStatusCodes.REQUEST_TOO_LONG]: jsonContent(
      z.object({
        message: z.string(),
        maxSize: z.number(),
        actualSize: z.number()
      }),
      "Import data exceeds size limits"
    )
  }
});

// Migration history
export const getMigrationHistory = createRoute({
  path: "/migration/history",
  method: "get",
  tags,
  summary: "Get migration history with pagination",
  description: "Retrieves paginated list of all migrations with their status and statistics",
  request: {
    query: z.object({
      page: z.coerce.number().int().default(1),
      limit: z.coerce.number().int().default(20),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
      type: z.enum(['normalize_legacy_reports', 'schema_migration', 'data_transformation', 'bulk_import']).optional(),
      createdBy: z.string().transform(Number).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional()
    })
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      migrationHistoryResponseSchema,
      "Migration history with pagination"
    )
  }
});

// Cancel migration
export const cancelMigration = createRoute({
  path: "/migration/{id}/cancel",
  method: "post",
  tags,
  summary: "Cancel an in-progress migration",
  description: "Cancels a currently running migration and performs cleanup",
  request: {
    params: z.object({
      id: z.string().describe("Migration ID")
    }),
    body: jsonContent(
      z.object({
        reason: z.string().optional()
      }),
      "Cancellation reason"
    )
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        migrationId: z.string(),
        cancelledAt: z.string().datetime()
      }),
      "Migration cancelled successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Migration not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        currentStatus: z.string()
      }),
      "Migration cannot be cancelled in current state"
    )
  }
});

// Rollback migration
export const rollbackMigration = createRoute({
  path: "/migration/{id}/rollback",
  method: "post",
  tags,
  summary: "Rollback a completed migration",
  description: "Reverts changes made by a completed migration, restoring original data",
  request: {
    params: z.object({
      id: z.string().describe("Migration ID")
    }),
    body: jsonContentRequired(
      rollbackMigrationRequestSchema,
      "Rollback configuration"
    )
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      z.object({
        rollbackId: z.string(),
        message: z.string(),
        originalMigrationId: z.string()
      }),
      "Rollback initiated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Migration not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        reason: z.string()
      }),
      "Migration cannot be rolled back"
    )
  }
});

// Data transformation
export const transformData = createRoute({
  path: "/migration/transform-data",
  method: "post",
  tags,
  summary: "Apply data transformations",
  description: "Applies custom transformation rules to data without full migration",
  request: {
    body: jsonContentRequired(
      dataTransformationRequestSchema,
      "Data transformation configuration"
    )
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        transformedData: z.array(z.record(z.string(), z.any())),
        transformationReport: z.object({
          totalRecords: z.number(),
          successfulTransformations: z.number(),
          failedTransformations: z.number(),
          warnings: z.array(z.string()),
          appliedRules: z.array(z.string())
        }),
        validationResults: validationResultSchema.optional()
      }),
      "Data transformed successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        transformationErrors: z.array(z.object({
          rule: z.string(),
          error: z.string(),
          affectedRecords: z.number()
        })).optional()
      }),
      "Transformation failed"
    )
  }
});

// Dry run migration
export const dryRunMigration = createRoute({
  path: "/migration/dry-run",
  method: "post",
  tags,
  summary: "Perform a dry run of migration without making changes",
  description: "Simulates migration process to identify potential issues without modifying data",
  request: {
    body: jsonContentRequired(
      z.union([
        normalizeLegacyReportsRequestSchema,
        schemaMigrationRequestSchema,
        bulkImportRequestSchema
      ]),
      "Migration configuration for dry run"
    )
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        dryRunId: z.string(),
        simulationResults: z.object({
          wouldSucceed: z.boolean(),
          affectedRecords: z.number(),
          estimatedTime: z.number(),
          potentialIssues: z.array(z.object({
            severity: z.enum(['error', 'warning', 'info']),
            message: z.string(),
            affectedFields: z.array(z.string()).optional()
          })),
          resourceRequirements: z.object({
            estimatedMemory: z.string(),
            estimatedDiskSpace: z.string(),
            estimatedDuration: z.string()
          }).optional()
        }),
        validationResults: validationResultSchema.optional(),
        recommendations: z.array(z.string()).optional()
      }),
      "Dry run completed successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        configurationErrors: z.array(z.string()).optional()
      }),
      "Invalid dry run configuration"
    )
  }
});

// Export route types for handlers
export type NormalizeLegacyReportsRoute = typeof normalizeLegacyReports;
export type ValidateMigrationRoute = typeof validateMigration;
export type GetMigrationStatusRoute = typeof getMigrationStatus;
export type MigrateSchemaRoute = typeof migrateSchema;
export type BulkImportRoute = typeof bulkImport;
export type GetMigrationHistoryRoute = typeof getMigrationHistory;
export type CancelMigrationRoute = typeof cancelMigration;
export type RollbackMigrationRoute = typeof rollbackMigration;
export type TransformDataRoute = typeof transformData;
export type DryRunMigrationRoute = typeof dryRunMigration;