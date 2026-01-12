import { z } from "@hono/zod-openapi";

export const reportStatusEnum = z.enum([
  'draft', 
  'submitted', 
  'approved', 
  'rejected',
  'pending_daf_approval',
  'rejected_by_daf',
  'approved_by_daf',
  'rejected_by_dg',
  'fully_approved'
]);
export const reportTypeEnum = z.enum([
  'revenue_expenditure', 
  'balance_sheet', 
  'cash_flow', 
  'budget_vs_actual', 
  'net_assets_changes'
]);

// Base schemas
export const insertFinancialReportSchema = z.object({
  reportCode: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  version: z.string().default('1.0'),
  fiscalYear: z.string().min(1).max(10),
  status: reportStatusEnum.default('draft'),
  reportData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  computedTotals: z.record(z.string(), z.any()).optional(),
  validationResults: z.record(z.string(), z.any()).optional(),
});

export const selectFinancialReportSchema = z.object({
  id: z.number().int(),
  reportCode: z.string(),
  title: z.string(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  version: z.string(),
  fiscalYear: z.string(),
  status: reportStatusEnum,
  reportData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).nullable(),
  computedTotals: z.record(z.string(), z.any()).nullable(),
  validationResults: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedBy: z.number().int().nullable(),
  updatedAt: z.string(),
  submittedBy: z.number().int().nullable(),
  submittedAt: z.string().nullable(),
  approvedBy: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  // Approval workflow fields
  dafId: z.number().int().nullable(),
  dafApprovedAt: z.string().nullable(),
  dafComment: z.string().nullable(),
  dgId: z.number().int().nullable(),
  dgApprovedAt: z.string().nullable(),
  dgComment: z.string().nullable(),
  finalPdfUrl: z.string().nullable(),
  locked: z.boolean(),
});

export const patchFinancialReportSchema = insertFinancialReportSchema.partial();

// Extended schemas with relations
export const financialReportWithRelationsSchema = selectFinancialReportSchema.extend({
  project: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    projectType: z.string().nullable(),
  }).optional(),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
    district: z.object({
      id: z.number(),
      name: z.string(),
    }).optional(),
  }).optional(),
  reportingPeriod: z.object({
    id: z.number(),
    year: z.number(),
    periodType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  creator: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  submitter: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  approver: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  dafApprover: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  dgApprover: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  workflowLogCount: z.number().int().optional(),
});

// Request/Response schemas
export const financialReportListRequestSchema = z.object({
  projectId: z.coerce.number().int().optional(),
  facilityId: z.coerce.number().int().optional(),
  fiscalYear: z.string().optional(),
  reportType: reportTypeEnum.optional(),
  status: reportStatusEnum.optional(),
  createdBy: z.coerce.number().int().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().default(1),
  limit: z.coerce.number().int().default(20),
});

export const financialReportListResponseSchema = z.object({
  reports: z.array(financialReportWithRelationsSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalReports: z.number(),
    byType: z.record(z.string(), z.number()),
    byFiscalYear: z.record(z.string(), z.number()),
    byProject: z.record(z.string(), z.number()),
  }).optional(),
});

// Report generation schemas
export const generateReportRequestSchema = z.object({
  templateType: reportTypeEnum,
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  fiscalYear: z.string(),
  title: z.string().optional(),
  includeComparatives: z.boolean().default(false),
  customMappings: z.record(z.string(), z.any()).optional(),
  generateFromPlanning: z.boolean().default(false),
  generateFromExecution: z.boolean().default(true),
});

export const generateReportResponseSchema = z.object({
  report: selectFinancialReportSchema,
  generationSummary: z.object({
    linesProcessed: z.number(),
    valuesComputed: z.number(),
    validationErrors: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});

export const calculateReportTotalsRequestSchema = z.object({
  recalculateAll: z.boolean().default(false),
});


// Report calculation schemas
export const calculateReportTotalsResponseSchema = z.object({
  reportId: z.number().int(),
  computedTotals: z.record(z.string(), z.any()),
  validationResults: z.record(z.string(), z.any()),
  calculationSummary: z.object({
    linesCalculated: z.number(),
    totalValue: z.number(),
    balanceValidation: z.boolean(),
    errors: z.array(z.string()),
  }),
});

// Report validation schemas
export const validateReportRequestSchema = z.object({
  reportId: z.number().int(),
  validationType: z.enum(['accounting_equation', 'completeness', 'business_rules', 'all']).default('all'),
});

export const validateReportResponseSchema = z.object({
  reportId: z.number().int(),
  isValid: z.boolean(),
  validationResults: z.object({
    accountingEquation: z.object({
      isValid: z.boolean(),
      leftSide: z.number(),
      rightSide: z.number(),
      difference: z.number(),
    }),
    completeness: z.object({
      isValid: z.boolean(),
      missingFields: z.array(z.string()),
      completionPercentage: z.number(),
    }),
    businessRules: z.object({
      isValid: z.boolean(),
      violations: z.array(z.object({
        rule: z.string(),
        field: z.string(),
        message: z.string(),
      })),
    }),
  }),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ============================================================================
// STATEMENT GENERATION SCHEMAS
// ============================================================================

export const statementCodeEnum = z.enum([
  'REV_EXP',
  'ASSETS_LIAB', 
  'CASH_FLOW',
  'NET_ASSETS_CHANGES',
  'BUDGET_VS_ACTUAL'
]);

export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);

// Aggregation level enum
export const aggregationLevelEnum = z.enum(['FACILITY', 'DISTRICT', 'PROVINCE']);

// Statement generation request schema
export const generateStatementRequestSchema = z.object({
  statementCode: statementCodeEnum,
  reportingPeriodId: z.number().int().positive(),
  projectType: projectTypeEnum,
  
  // NEW: Aggregation level control
  aggregationLevel: aggregationLevelEnum
    .optional()
    .default('DISTRICT')
    .describe('Organizational level for data aggregation'),
  
  // ENHANCED: Now required when aggregationLevel is FACILITY
  facilityId: z.number().int().positive()
    .optional()
    .describe('Specific facility ID for facility-level statements'),
  
  // NEW: Optional facility breakdown
  includeFacilityBreakdown: z.boolean()
    .optional()
    .default(false)
    .describe('Include per-facility details in aggregated statements'),
  
  includeComparatives: z.boolean().default(true),
  customMappings: z.record(z.string(), z.any()).optional(),
  
  // NEW: Optional report ID for snapshot-based display (Task 10)
  reportId: z.number().int().positive()
    .optional()
    .describe('Financial report ID - if provided and report is submitted/approved, returns snapshot data'),
});

// Standard statement line schema (for existing statements)
export const statementLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  note: z.number().int().optional(),
  currentPeriodValue: z.number(),
  previousPeriodValue: z.number(),
  variance: z.object({
    absolute: z.number(),
    percentage: z.number(),
  }).optional(),
  formatting: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    indentLevel: z.number().int().min(0),
    isSection: z.boolean(),
    isSubtotal: z.boolean(),
    isTotal: z.boolean(),
  }),
  metadata: z.object({
    lineCode: z.string(),
    eventCodes: z.array(z.string()),
    formula: z.string().optional(),
    isComputed: z.boolean(),
    displayOrder: z.number().int(),
  }),
});

// Budget vs Actual mapping interface
export const budgetVsActualMappingSchema = z.object({
  lineCode: z.string(),
  budgetEvents: z.array(z.string()),
  actualEvents: z.array(z.string()),
  note: z.number().int().optional(),
});

// Budget vs Actual line schema - six column structure
export const budgetVsActualLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  note: z.number().int().optional(),
  revisedBudget: z.number(), // Column A
  actual: z.number(), // Column B
  variance: z.number(), // A - B
  performancePercentage: z.number().optional(), // (B / A) * 100, null when budget is zero
  formatting: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    indentLevel: z.number().int().min(0),
    isSection: z.boolean(),
    isSubtotal: z.boolean(),
    isTotal: z.boolean(),
  }),
  metadata: z.object({
    lineCode: z.string(),
    eventCodes: z.array(z.string()),
    formula: z.string().optional(),
    isComputed: z.boolean(),
    displayOrder: z.number().int(),
    budgetVsActualMapping: z.object({
      budgetEvents: z.array(z.string()),
      actualEvents: z.array(z.string()),
    }).optional(),
  }),
});

// Base statement schema for standard two-column statements
export const standardStatementSchema = z.object({
  statementCode: z.string(),
  statementName: z.string(),
  reportingPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  previousPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  hasPreviousPeriodData: z.boolean(),
  facility: z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    district: z.string().optional(),
  }).optional(),
  generatedAt: z.string(),
  lines: z.array(statementLineSchema),
  totals: z.record(z.string(), z.number()),
  metadata: z.object({
    templateVersion: z.string(),
    calculationFormulas: z.record(z.string(), z.string()),
    validationResults: z.object({
      totalRules: z.number().int(),
      passedRules: z.number().int(),
      failedRules: z.number().int(),
      warningCount: z.number().int(),
      errorCount: z.number().int(),
    }),
    footnotes: z.array(z.object({
      number: z.number().int(),
      text: z.string(),
      relatedLines: z.array(z.string()),
    })),
  }),
});

// Budget vs Actual statement schema - four+ column structure
export const budgetVsActualStatementSchema = z.object({
  statementCode: z.literal('BUDGET_VS_ACTUAL'),
  statementName: z.string(),
  reportingPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  facility: z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    district: z.string().optional(),
  }).optional(),
  generatedAt: z.string(),
  lines: z.array(budgetVsActualLineSchema),
  totals: z.record(z.string(), z.object({
    budget: z.number(),
    actual: z.number(),
    variance: z.number(),
  })),
  metadata: z.object({
    templateVersion: z.string(),
    calculationFormulas: z.record(z.string(), z.string()),
    validationResults: z.object({
      totalRules: z.number().int(),
      passedRules: z.number().int(),
      failedRules: z.number().int(),
      warningCount: z.number().int(),
      errorCount: z.number().int(),
    }),
    footnotes: z.array(z.object({
      number: z.number().int(),
      text: z.string(),
      relatedLines: z.array(z.string()),
    })),
    customEventMappings: z.array(budgetVsActualMappingSchema).optional(),
  }),
});

// Aggregation metadata schema
export const aggregationMetadataSchema = z.object({
  level: aggregationLevelEnum,
  
  // Facility-level metadata
  facilityId: z.number().optional(),
  facilityName: z.string().optional(),
  facilityType: z.string().optional(),
  
  // District-level metadata
  districtId: z.number().optional(),
  districtName: z.string().optional(),
  
  // Province-level metadata
  provinceId: z.number().optional(),
  provinceName: z.string().optional(),
  
  // Common metadata
  facilitiesIncluded: z.array(z.number()),
  totalFacilities: z.number(),
  dataCompleteness: z.object({
    facilitiesWithPlanning: z.number(),
    facilitiesWithExecution: z.number(),
    facilitiesWithBoth: z.number(),
  }),
});

// Facility breakdown schema
export const facilityBreakdownItemSchema = z.object({
  facilityId: z.number(),
  facilityName: z.string(),
  facilityType: z.string(),
  budget: z.number(),
  actual: z.number(),
  variance: z.number(),
  variancePercentage: z.number(),
  isFavorable: z.boolean(),
});

// Task 10: Snapshot metadata schema (Requirements: 3.4, 3.5)
export const snapshotMetadataSchema = z.object({
  isSnapshot: z.boolean().describe('True if displaying snapshot data, false if live data'),
  snapshotTimestamp: z.string().nullable().describe('ISO timestamp when snapshot was captured'),
  isOutdated: z.boolean().describe('True if source data has changed since snapshot'),
  reportId: z.number().nullable().describe('Associated report ID if applicable'),
  reportStatus: z.string().optional().describe('Report status (for snapshot data)'),
  version: z.string().optional().describe('Report version (for snapshot data)'),
});

// Statement generation response schema with union types for backward compatibility
export const generateStatementResponseSchema = z.object({
  statement: z.union([
    standardStatementSchema,
    budgetVsActualStatementSchema,
  ]),
  validation: z.object({
    isValid: z.boolean(),
    accountingEquation: z.object({
      isValid: z.boolean(),
      leftSide: z.number(),
      rightSide: z.number(),
      difference: z.number(),
      equation: z.string(),
    }),
    businessRules: z.array(z.object({
      ruleId: z.string(),
      ruleName: z.string(),
      isValid: z.boolean(),
      message: z.string(),
      affectedFields: z.array(z.string()),
    })),
    warnings: z.array(z.string()),
    errors: z.array(z.string()),
    formattedMessages: z.object({
      critical: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
        affectedFields: z.array(z.string()).optional(),
      })),
      warnings: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
        affectedFields: z.array(z.string()).optional(),
      })),
      info: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
      })),
    }),
    summary: z.object({
      totalChecks: z.number().int(),
      passedChecks: z.number().int(),
      criticalErrors: z.number().int(),
      warnings: z.number().int(),
      overallStatus: z.enum(['VALID', 'INVALID']),
    }),
  }),
  performance: z.object({
    processingTimeMs: z.number(),
    linesProcessed: z.number().int(),
    eventsProcessed: z.number().int(),
    formulasCalculated: z.number().int(),
  }),
  
  // NEW: Aggregation metadata
  aggregationMetadata: aggregationMetadataSchema.optional(),
  
  // NEW: Optional facility breakdown
  facilityBreakdown: z.array(facilityBreakdownItemSchema).optional(),
  
  // Task 10: Snapshot metadata (Requirements: 3.4, 3.5)
  snapshotMetadata: snapshotMetadataSchema.optional(),
});

// ============================================================================
// STATEMENT EXPORT SCHEMAS
// ============================================================================

export const exportFormatEnum = z.enum(['pdf', 'excel', 'csv']);
export const pageOrientationEnum = z.enum(['portrait', 'landscape']);
export const fontSizeEnum = z.enum(['small', 'medium', 'large']);

export const exportStatementRequestSchema = z.object({
  // Two modes:
  // 1. Snapshot mode: Provide reportId to export submitted/approved report snapshot
  // 2. Live mode: Provide statementCode, reportingPeriodId, etc. to generate from live data
  reportId: z.number().int().positive().optional(),
  
  // Required for live mode, optional for snapshot mode
  statementCode: statementCodeEnum.optional(),
  reportingPeriodId: z.number().int().positive().optional(),
  projectType: projectTypeEnum.optional(),
  facilityId: z.number().int().positive().optional(),
  
  includeComparatives: z.boolean().default(true),
  exportFormat: exportFormatEnum.default('pdf'),
  exportOptions: z.object({
    includeMetadata: z.boolean().default(true),
    includeFootnotes: z.boolean().default(true),
    includeValidation: z.boolean().default(false),
    pageOrientation: pageOrientationEnum.default('portrait'),
    fontSize: fontSizeEnum.default('medium'),
    showZeroValues: z.boolean().default(true),
    highlightNegatives: z.boolean().default(true),
    includeCharts: z.boolean().default(false),
  }).optional(),
}).refine(
  (data) => {
    // Either reportId OR (statementCode + reportingPeriodId + projectType) must be provided
    const hasReportId = !!data.reportId;
    const hasLiveParams = !!(data.statementCode && data.reportingPeriodId && data.projectType);
    return hasReportId || hasLiveParams;
  },
  {
    message: "Either 'reportId' (for snapshot mode) or 'statementCode', 'reportingPeriodId', and 'projectType' (for live mode) must be provided"
  }
);

export type ExportStatementRequest = z.infer<typeof exportStatementRequestSchema>;
export type ExportFormat = z.infer<typeof exportFormatEnum>;
export type ExportOptions = z.infer<typeof exportStatementRequestSchema>['exportOptions'];

// ============================================================================
// BUDGET VS ACTUAL TYPE DEFINITIONS
// ============================================================================

export type BudgetVsActualLine = z.infer<typeof budgetVsActualLineSchema>;
export type BudgetVsActualStatement = z.infer<typeof budgetVsActualStatementSchema>;
export type BudgetVsActualMapping = z.infer<typeof budgetVsActualMappingSchema>;
export type StandardStatement = z.infer<typeof standardStatementSchema>;
export type GenerateStatementResponse = z.infer<typeof generateStatementResponseSchema>;

// ============================================================================
// AGGREGATION TYPE DEFINITIONS
// ============================================================================

export type AggregationLevel = z.infer<typeof aggregationLevelEnum>;
export type AggregationMetadata = z.infer<typeof aggregationMetadataSchema>;
export type FacilityBreakdownItem = z.infer<typeof facilityBreakdownItemSchema>;
export type GenerateStatementRequest = z.infer<typeof generateStatementRequestSchema>;

// ============================================================================
// TYPE GUARDS FOR STATEMENT RESPONSE TYPES
// ============================================================================

/**
 * Type guard to check if a statement is a Budget vs Actual statement
 */
export function isBudgetVsActualStatement(
  statement: StandardStatement | BudgetVsActualStatement
): statement is BudgetVsActualStatement {
  return statement.statementCode === 'BUDGET_VS_ACTUAL';
}

/**
 * Type guard to check if a statement is a standard two-column statement
 */
export function isStandardStatement(
  statement: StandardStatement | BudgetVsActualStatement
): statement is StandardStatement {
  return statement.statementCode !== 'BUDGET_VS_ACTUAL';
}

/**
 * Type guard to check if a line is a Budget vs Actual line
 */
export function isBudgetVsActualLine(
  line: any
): line is BudgetVsActualLine {
  return (
    typeof line === 'object' &&
    line !== null &&
    'revisedBudget' in line &&
    'actual' in line &&
    'variance' in line &&
    typeof line.revisedBudget === 'number' &&
    typeof line.actual === 'number' &&
    typeof line.variance === 'number'
  );
}

// ============================================================================
// WORKFLOW LOG SCHEMAS
// ============================================================================

export const workflowActionEnum = z.enum([
  'submitted',
  'daf_approved',
  'daf_rejected',
  'dg_approved',
  'dg_rejected'
]);

export const workflowLogSchema = z.object({
  id: z.number().int(),
  reportId: z.number().int(),
  action: workflowActionEnum,
  actorId: z.number().int(),
  comment: z.string().nullable(),
  timestamp: z.string(),
});

export const workflowLogWithActorSchema = workflowLogSchema.extend({
  actor: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
});

export const insertWorkflowLogSchema = z.object({
  reportId: z.number().int(),
  action: workflowActionEnum,
  actorId: z.number().int(),
  comment: z.string().optional(),
});

// ============================================================================
// APPROVAL WORKFLOW ACTION SCHEMAS
// ============================================================================

export const submitForApprovalRequestSchema = z.object({
  // No body needed, uses route param
});

export const approvalActionRequestSchema = z.object({
  comment: z.string().optional(),
});

export const rejectionActionRequestSchema = z.object({
  comment: z.string().min(1, 'Rejection comment is required'),
});

export const approvalActionResponseSchema = z.object({
  report: selectFinancialReportSchema,
  message: z.string(),
});

export const workflowLogsResponseSchema = z.object({
  logs: z.array(workflowLogWithActorSchema),
});

// ============================================================================
// WORKFLOW TYPE DEFINITIONS
// ============================================================================

export type WorkflowAction = z.infer<typeof workflowActionEnum>;
export type WorkflowLog = z.infer<typeof workflowLogSchema>;
export type WorkflowLogWithActor = z.infer<typeof workflowLogWithActorSchema>;
export type InsertWorkflowLog = z.infer<typeof insertWorkflowLogSchema>;
export type ApprovalActionRequest = z.infer<typeof approvalActionRequestSchema>;
export type RejectionActionRequest = z.infer<typeof rejectionActionRequestSchema>;
export type ApprovalActionResponse = z.infer<typeof approvalActionResponseSchema>;

// ============================================================================
// PERIOD LOCK SCHEMAS
// ============================================================================

export const periodLockSchema = z.object({
  id: z.number().int(),
  reportingPeriodId: z.number().int(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  isLocked: z.boolean(),
  lockedBy: z.number().int().nullable(),
  lockedAt: z.string().nullable(),
  lockedReason: z.string().nullable(),
  unlockedBy: z.number().int().nullable(),
  unlockedAt: z.string().nullable(),
  unlockedReason: z.string().nullable(),
});

export const periodLockWithRelationsSchema = periodLockSchema.extend({
  reportingPeriod: z.object({
    id: z.number(),
    year: z.number(),
    periodType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  project: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    projectType: z.string().nullable(),
  }).optional(),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
  }).optional(),
  lockedByUser: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  unlockedByUser: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
});

export const periodLockAuditLogSchema = z.object({
  id: z.number().int(),
  periodLockId: z.number().int(),
  action: z.enum(['LOCKED', 'UNLOCKED', 'EDIT_ATTEMPTED']),
  performedBy: z.number().int(),
  performedAt: z.string(),
  reason: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
});

export const periodLockAuditLogWithActorSchema = periodLockAuditLogSchema.extend({
  performer: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
});

// Request/Response schemas for period lock endpoints
export const getPeriodLocksRequestSchema = z.object({
  facilityId: z.coerce.number().int().positive(),
});

export const getPeriodLocksResponseSchema = z.object({
  locks: z.array(periodLockWithRelationsSchema),
});

export const unlockPeriodRequestSchema = z.object({
  reason: z.string().min(1, 'Unlock reason is required'),
});

export const unlockPeriodResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  periodLock: periodLockWithRelationsSchema,
});

export const getPeriodLockAuditRequestSchema = z.object({
  // No query params needed, uses route param
});

export const getPeriodLockAuditResponseSchema = z.object({
  auditLogs: z.array(periodLockAuditLogWithActorSchema),
});

// ============================================================================
// PERIOD LOCK TYPE DEFINITIONS
// ============================================================================

export type PeriodLock = z.infer<typeof periodLockSchema>;
export type PeriodLockWithRelations = z.infer<typeof periodLockWithRelationsSchema>;
export type PeriodLockAuditLog = z.infer<typeof periodLockAuditLogSchema>;
export type PeriodLockAuditLogWithActor = z.infer<typeof periodLockAuditLogWithActorSchema>;
export type GetPeriodLocksRequest = z.infer<typeof getPeriodLocksRequestSchema>;
export type GetPeriodLocksResponse = z.infer<typeof getPeriodLocksResponseSchema>;
export type UnlockPeriodRequest = z.infer<typeof unlockPeriodRequestSchema>;
export type UnlockPeriodResponse = z.infer<typeof unlockPeriodResponseSchema>;
export type GetPeriodLockAuditResponse = z.infer<typeof getPeriodLockAuditResponseSchema>;

// ============================================================================
// VERSION CONTROL SCHEMAS
// ============================================================================

export const reportVersionSchema = z.object({
  id: z.number().int(),
  reportId: z.number().int(),
  versionNumber: z.string(),
  snapshotData: z.record(z.string(), z.any()),
  snapshotChecksum: z.string(),
  snapshotTimestamp: z.string(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string().nullable(),
  changesSummary: z.string().nullable(),
});

export const reportVersionWithCreatorSchema = reportVersionSchema.extend({
  creator: z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }).optional(),
});

export const versionDifferenceSchema = z.object({
  lineCode: z.string(),
  lineName: z.string(),
  field: z.string(),
  version1Value: z.number(),
  version2Value: z.number(),
  difference: z.number(),
  percentageChange: z.number(),
});

// Request/Response schemas for version control endpoints
export const getVersionsResponseSchema = z.object({
  reportId: z.number().int(),
  currentVersion: z.string(),
  versions: z.array(reportVersionWithCreatorSchema),
});

export const getVersionResponseSchema = z.object({
  version: reportVersionWithCreatorSchema,
});

export const compareVersionsRequestSchema = z.object({
  version1: z.string().min(1, 'Version 1 is required'),
  version2: z.string().min(1, 'Version 2 is required'),
});

export const compareVersionsResponseSchema = z.object({
  version1: z.string(),
  version2: z.string(),
  differences: z.array(versionDifferenceSchema),
  summary: z.object({
    totalDifferences: z.number().int(),
    significantChanges: z.number().int(),
  }),
});

// ============================================================================
// VERSION CONTROL TYPE DEFINITIONS
// ============================================================================

export type ReportVersion = z.infer<typeof reportVersionSchema>;
export type ReportVersionWithCreator = z.infer<typeof reportVersionWithCreatorSchema>;
export type VersionDifference = z.infer<typeof versionDifferenceSchema>;
export type GetVersionsResponse = z.infer<typeof getVersionsResponseSchema>;
export type GetVersionResponse = z.infer<typeof getVersionResponseSchema>;
export type CompareVersionsRequest = z.infer<typeof compareVersionsRequestSchema>;
export type CompareVersionsResponse = z.infer<typeof compareVersionsResponseSchema>;

// ============================================================================
// BASE TYPE DEFINITIONS
// ============================================================================

export type ReportStatus = z.infer<typeof reportStatusEnum>;
export type FinancialReport = z.infer<typeof selectFinancialReportSchema>;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
export type PatchFinancialReport = z.infer<typeof patchFinancialReportSchema>;
export type FinancialReportWithRelations = z.infer<typeof financialReportWithRelationsSchema>;
