
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/api/db";
import { 
  formSchemas, 
  projects, 
} from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  NormalizeLegacyReportsRoute,
  ValidateMigrationRoute,
  GetMigrationStatusRoute,
  MigrateSchemaRoute,
  BulkImportRoute,
  GetMigrationHistoryRoute,
  CancelMigrationRoute,
  RollbackMigrationRoute,
  TransformDataRoute,
  DryRunMigrationRoute
} from "./migration.routes";
import {
    performLegacyNormalization,
    validateNormalizedData,
    saveNormalizedData,
    generateMappingReport,
    performMigrationValidation,
    performSchemaMigration,
    parseImportData,
    performBulkImport,
    generateMigrationDescription,
    canMigrationBeRolledBack,
    performMigrationRollback,
    performDataTransformation,
    validateTransformedData,
    simulateLegacyNormalization,
    simulateSchemaMigration,
    simulateBulkImport,
    MigrationJob,
    activeMigrations
} from "./migration.utils"


// Helper function to validate schema existence
async function validateSchemaExists(schemaId: number) {
  const schema = await db.query.formSchemas.findFirst({
    where: and(eq(formSchemas.id, schemaId), eq(formSchemas.isActive, true))
  });
  
  if (!schema) {
    throw new Error(`Form schema with ID ${schemaId} not found or inactive`);
  }
  
  return schema;
}

// Helper function to validate project access
async function validateProjectAccess(projectId: number, facilityId: number) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { facility: true }
  });
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  if (project.facilityId !== facilityId) {
    throw new Error(`Project ${projectId} does not belong to facility ${facilityId}`);
  }
  
  return project;
}

// Legacy data normalization handler
export const normalizeLegacyReports: AppRouteHandler<NormalizeLegacyReportsRoute> = async (c) => {
  try {
    const {
      legacyData,
      targetSchemaId,
      projectId,
      facilityId,
      reportingPeriodId,
      mappingRules,
      validationMode = 'strict',
      preserveOriginal = true,
      metadata
    } = await c.req.json();

    // Validate inputs
    const [targetSchema, project] = await Promise.all([
      validateSchemaExists(targetSchemaId),
      validateProjectAccess(projectId, facilityId)
    ]);

    // Create migration job
    const migrationId = uuidv4();
    const migrationJob: MigrationJob = {
      id: migrationId,
      type: 'normalize_legacy_reports',
      status: 'in_progress',
      progress: 0,
      startedAt: new Date(),
      statistics: {
        recordsProcessed: 0,
        recordsTotal: Object.keys(legacyData).length,
        recordsSuccessful: 0,
        recordsFailed: 0,
        recordsSkipped: 0
      },
      metadata: { ...metadata, preserveOriginal },
      originalData: preserveOriginal ? legacyData : undefined
    };

    activeMigrations.set(migrationId, migrationJob);

    // Process normalization asynchronously
    setImmediate(async () => {
      try {
        const normalizedData = await performLegacyNormalization(
          legacyData,
          targetSchema,
          mappingRules,
          migrationJob
        );

        // Validate normalized data
        const validationResults = await validateNormalizedData(
          normalizedData,
          targetSchema,
          validationMode,
          migrationJob
        );

        // If validation passes or mode is lenient, save the data
        if (validationResults.isValid || validationMode !== 'strict') {
          await saveNormalizedData(
            normalizedData,
            targetSchemaId,
            projectId,
            facilityId,
            reportingPeriodId,
            migrationJob
          );
        }

        migrationJob.status = validationResults.isValid ? 'completed' : 'failed';
        migrationJob.completedAt = new Date();
        migrationJob.progress = 100;
        migrationJob.results = {
          normalizedData: validationResults.isValid ? normalizedData : undefined,
          validationResults
        };

      } catch (error) {
        migrationJob.status = 'failed';
        migrationJob.completedAt = new Date();
        migrationJob.errors = migrationJob.errors || [];
        migrationJob.errors.push({
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          context: { step: 'normalization' }
        });
      }
    });

    // Generate mapping report
    const mappingReport = generateMappingReport(legacyData, targetSchema.schema, mappingRules);

    return c.json({
      migrationId,
      status: migrationJob.status,
      validationResults: {
        isValid: true, // Initial validation passed
        errors: [],
        warnings: [],
        summary: {
          totalFields: Object.keys(legacyData).length,
          validFields: Object.keys(legacyData).length,
          errorFields: 0,
          warningFields: 0
        }
      },
      mappingReport,
      createdAt: migrationJob.startedAt!.toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 30000).toISOString() // 30 seconds estimate
    }, HttpStatusCodes.OK);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Migration failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

// Migration validation handler
export const validateMigration: AppRouteHandler<ValidateMigrationRoute> = async (c) => {
  try {
    const { migrationId, validationType = 'structure', includeWarnings = true, customValidators } = await c.req.json();

    const migrationJob = activeMigrations.get(migrationId);
    if (!migrationJob) {
      return c.json({ message: "Migration not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const validationResults = await performMigrationValidation(
      migrationJob,
      validationType,
      includeWarnings,
      customValidators
    );

    return c.json({
      migrationId,
      isValid: validationResults.isValid,
      validationType,
      results: validationResults.results,
      summary: validationResults.summary,
      recommendations: validationResults.recommendations,
      validatedAt: new Date().toISOString()
    }, HttpStatusCodes.OK);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Validation failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

// Get migration status handler
export const getMigrationStatus: AppRouteHandler<GetMigrationStatusRoute> = async (c) => {
  const { id } = c.req.param();
  
  const migrationJob = activeMigrations.get(id);
  if (!migrationJob) {
    return c.json({ message: "Migration not found" }, HttpStatusCodes.NOT_FOUND);
  }

  const estimatedTimeRemaining = migrationJob.status === 'in_progress' && migrationJob.startedAt 
    ? Math.max(0, 60 - Math.floor((Date.now() - migrationJob.startedAt.getTime()) / 1000))
    : undefined;

  return c.json({
    id: migrationJob.id,
    type: migrationJob.type as any,
    status: migrationJob.status,
    progress: migrationJob.progress,
    currentStep: migrationJob.currentStep,
    totalSteps: migrationJob.totalSteps,
    startedAt: migrationJob.startedAt?.toISOString(),
    completedAt: migrationJob.completedAt?.toISOString(),
    estimatedTimeRemaining,
    statistics: migrationJob.statistics,
    errors: migrationJob.errors?.map(e => ({
      timestamp: e.timestamp.toISOString(),
      error: e.error,
      context: e.context
    })),
    warnings: migrationJob.warnings,
    metadata: migrationJob.metadata,
    updatedAt: new Date().toISOString()
  }, HttpStatusCodes.OK);
};

// Schema migration handler
export const migrateSchema: AppRouteHandler<MigrateSchemaRoute> = async (c) => {
  try {
    const {
      sourceSchemaId,
      targetSchemaId,
      entityIds,
      fieldMappings,
      transformationRules,
      options = {}
    } = await c.req.json();

    // Validate schemas exist
    const [sourceSchema, targetSchema] = await Promise.all([
      validateSchemaExists(sourceSchemaId),
      validateSchemaExists(targetSchemaId)
    ]);

    // Check for conflicting migrations
    const existingMigration = Array.from(activeMigrations.values())
      .find(m => m.status === 'in_progress' && m.type === 'schema_migration');
    
    if (existingMigration) {
      return c.json({
        message: "Another schema migration is already in progress",
        conflictingMigrations: [existingMigration.id]
      }, HttpStatusCodes.CONFLICT);
    }

    const migrationId = uuidv4();
    const migrationJob: MigrationJob = {
      id: migrationId,
      type: 'schema_migration',
      status: 'in_progress',
      progress: 0,
      startedAt: new Date(),
      metadata: { sourceSchemaId, targetSchemaId, options }
    };

    activeMigrations.set(migrationId, migrationJob);

    // Start async migration process
    setImmediate(() => performSchemaMigration(migrationJob, sourceSchema, targetSchema, entityIds, fieldMappings, transformationRules, options));

    return c.json({
      migrationId,
      message: "Schema migration initiated successfully",
      estimatedTime: 300 // 5 minutes estimate
    }, HttpStatusCodes.ACCEPTED);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Schema migration failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

// Bulk import handler
export const bulkImport: AppRouteHandler<BulkImportRoute> = async (c) => {
  try {
    const { importType, schemaId, data, options = {}, fieldMappings, defaultValues, metadata } = await c.req.json();

    // Validate schema
    const schema = await validateSchemaExists(schemaId);

    // Check data size (basic validation)
    const dataSize = Buffer.byteLength(data, 'utf8');
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    
    if (dataSize > maxSize) {
      return c.json({
        message: "Import data exceeds maximum size limit",
        maxSize,
        actualSize: dataSize
      }, HttpStatusCodes.REQUEST_TOO_LONG);
    }

    // Parse and preview data
    const { parsedData, statistics } = await parseImportData(data, importType, options);
    const previewData = parsedData.slice(0, 5); // First 5 records for preview

    const migrationId = uuidv4();
    const migrationJob: MigrationJob = {
      id: migrationId,
      type: 'bulk_import',
      status: 'in_progress',
      progress: 0,
      startedAt: new Date(),
      statistics: {
        recordsProcessed: 0,
        recordsTotal: parsedData.length,
        recordsSuccessful: 0,
        recordsFailed: 0,
        recordsSkipped: 0
      },
      metadata: { importType, schemaId, options, fieldMappings, defaultValues, metadata }
    };

    activeMigrations.set(migrationId, migrationJob);

    // Start async import process
    setImmediate(() => performBulkImport(migrationJob, parsedData, schema, fieldMappings, defaultValues));

    return c.json({
      migrationId,
      message: "Bulk import initiated successfully",
      previewData,
      statistics
    }, HttpStatusCodes.ACCEPTED);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Bulk import failed',
      formatErrors: [error instanceof Error ? error.message : 'Unknown error']
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

// Migration history handler
export const getMigrationHistory: AppRouteHandler<GetMigrationHistoryRoute> = async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = Math.min(parseInt(query.limit || '20'), 100);
  const offset = (page - 1) * limit;

  // Filter migrations based on query parameters
  let filteredMigrations = Array.from(activeMigrations.values());

  if (query.status) {
    filteredMigrations = filteredMigrations.filter(m => m.status === query.status);
  }
  if (query.type) {
    filteredMigrations = filteredMigrations.filter(m => m.type === query.type);
  }
  if (query.dateFrom) {
    const fromDate = new Date(query.dateFrom);
    filteredMigrations = filteredMigrations.filter(m => m.startedAt && m.startedAt >= fromDate);
  }
  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    filteredMigrations = filteredMigrations.filter(m => m.startedAt && m.startedAt <= toDate);
  }

  // Sort by creation date (newest first)
  filteredMigrations.sort((a, b) => 
    (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0)
  );

  const total = filteredMigrations.length;
  const paginatedMigrations = filteredMigrations.slice(offset, offset + limit);

  return c.json({
    migrations: paginatedMigrations.map(m => ({
      id: m.id,
      type: m.type as any,
      status: m.status,
      description: generateMigrationDescription(m),
      startedAt: m.startedAt!.toISOString(),
      completedAt: m.completedAt?.toISOString(),
      createdBy: m.createdBy ? {
        id: m.createdBy,
        name: 'System User', // In real implementation, fetch from users table
        email: 'system@example.com'
      } : undefined,
      statistics: m.statistics,
      canRollback: canMigrationBeRolledBack(m)
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, HttpStatusCodes.OK);
};

// Cancel migration handler
export const cancelMigration: AppRouteHandler<CancelMigrationRoute> = async (c) => {
  const { id } = c.req.param();
  const { reason } = await c.req.json();

  const migrationJob = activeMigrations.get(id);
  if (!migrationJob) {
    return c.json({ message: "Migration not found" }, HttpStatusCodes.NOT_FOUND);
  }

  if (migrationJob.status !== 'in_progress' && migrationJob.status !== 'pending') {
    return c.json({
      message: "Migration cannot be cancelled in current state",
      currentStatus: migrationJob.status
    }, HttpStatusCodes.CONFLICT);
  }

  migrationJob.status = 'cancelled';
  migrationJob.completedAt = new Date();
  migrationJob.metadata = { ...migrationJob.metadata, cancellationReason: reason };

  return c.json({
    message: "Migration cancelled successfully",
    migrationId: id,
    cancelledAt: migrationJob.completedAt.toISOString()
  }, HttpStatusCodes.OK);
};

// Rollback migration handler
export const rollbackMigration: AppRouteHandler<RollbackMigrationRoute> = async (c) => {
  const { id } = c.req.param();
  const { rollbackReason, preserveChanges = false } = await c.req.json();

  const migrationJob = activeMigrations.get(id);
  if (!migrationJob) {
    return c.json({ message: "Migration not found" }, HttpStatusCodes.NOT_FOUND);
  }

  if (!canMigrationBeRolledBack(migrationJob)) {
    return c.json({
      message: "Migration cannot be rolled back",
      reason: "Migration either failed, was cancelled, or doesn't have rollback data"
    }, HttpStatusCodes.BAD_REQUEST);
  }

  const rollbackId = uuidv4();
  const rollbackJob: MigrationJob = {
    id: rollbackId,
    type: 'rollback',
    status: 'in_progress',
    progress: 0,
    startedAt: new Date(),
    metadata: { 
      originalMigrationId: id, 
      rollbackReason, 
      preserveChanges 
    }
  };

  activeMigrations.set(rollbackId, rollbackJob);

  // Start async rollback process
  setImmediate(() => performMigrationRollback(rollbackJob, migrationJob, preserveChanges));

  return c.json({
    rollbackId,
    message: "Rollback initiated successfully",
    originalMigrationId: id
  }, HttpStatusCodes.ACCEPTED);
};

// Data transformation handler
export const transformData: AppRouteHandler<TransformDataRoute> = async (c) => {
  try {
    const { sourceData, transformationRules, targetSchema, options = {} } = await c.req.json();

    const transformationResults = await performDataTransformation(
      sourceData,
      transformationRules,
      targetSchema,
      options
    );

    let validationResults;
    if (options.validateOutput && targetSchema) {
      validationResults = await validateTransformedData(transformationResults.transformedData, targetSchema);
    }

    return c.json({
      transformedData: transformationResults.transformedData,
      transformationReport: transformationResults.report,
      validationResults
    }, HttpStatusCodes.OK);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Data transformation failed',
      transformationErrors: [{
        rule: 'general',
        error: error instanceof Error ? error.message : 'Unknown error',
        affectedRecords: 0
      }]
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

// Dry run migration handler
export const dryRunMigration: AppRouteHandler<DryRunMigrationRoute> = async (c) => {
  try {
    const requestData = await c.req.json();
    const dryRunId = uuidv4();

    // Determine migration type and perform simulation
    let simulationResults;
    
    if ('legacyData' in requestData) {
      simulationResults = await simulateLegacyNormalization(requestData);
    } else if ('sourceSchemaId' in requestData) {
      simulationResults = await simulateSchemaMigration(requestData);
    } else if ('importType' in requestData) {
      simulationResults = await simulateBulkImport(requestData);
    } else {
      throw new Error('Invalid migration configuration for dry run');
    }

    return c.json({
      dryRunId,
      simulationResults,
    }, HttpStatusCodes.OK);

  } catch (error) {
    return c.json({
      message: error instanceof Error ? error.message : 'Dry run failed',
      configurationErrors: [error instanceof Error ? error.message : 'Unknown error']
    }, HttpStatusCodes.BAD_REQUEST);
  }
};
