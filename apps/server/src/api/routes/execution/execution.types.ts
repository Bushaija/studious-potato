import { z } from "@hono/zod-openapi";

// Base execution data schema
export const insertExecutionDataSchema = z.object({
  schemaId: z.number().int(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int().optional(),
  formData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectExecutionDataSchema = z.object({
  id: z.number().int(),
  schemaId: z.number().int(),
  entityId: z.number().int().nullable(),
  entityType: z.string(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int().nullable(),
  formData: z.record(z.string(), z.any()),
  computedValues: z.record(z.string(), z.any()).nullable(),
  validationState: z.record(z.string(), z.any()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedBy: z.number().int().nullable(),
  updatedAt: z.string(),
});

export const patchExecutionDataSchema = insertExecutionDataSchema.partial();

// Balance calculation schemas
export const quarterlyValuesSchema = z.object({
  q1: z.number(),
  q2: z.number(),
  q3: z.number(),
  q4: z.number(),
  cumulativeBalance: z.number(),
});

export const calculateBalancesSchema = z.object({
  executionId: z.number().int(),
  data: z.record(z.string(), z.any()),
});

export const balancesResponseSchema = z.object({
  receipts: quarterlyValuesSchema,
  expenditures: quarterlyValuesSchema,
  surplus: quarterlyValuesSchema,
  financialAssets: quarterlyValuesSchema,
  financialLiabilities: quarterlyValuesSchema,
  netFinancialAssets: quarterlyValuesSchema,
  closingBalance: quarterlyValuesSchema,
  isBalanced: z.boolean(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })),
});

// Accounting equation validation schema
export const accountingEquationValidationSchema = z.object({
  data: z.record(z.string(), z.any()),
  tolerance: z.number().default(0.01), // Allow small rounding differences
});

// Query parameters
export const executionListQuerySchema = z.object({
  // Direct ID filters
  projectId: z.string().optional().describe("Filter by specific project ID"),
  facilityId: z.string().optional().describe("Filter by specific facility ID"),
  reportingPeriodId: z.string().optional().describe("Filter by specific reporting period ID"),
  categoryId: z.string().optional().describe("Filter by specific category ID"),
  districtId: z.string().optional().describe("Filter by district ID (admin users only - ignored for non-admin users)"),

  // Type-based filters
  facilityType: z.enum(['hospital', 'health_center']).optional().describe("Filter by facility type"),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Filter by project type"),
  reportingPeriod: z.string().optional().describe("Filter by reporting period year (e.g., '2024')"),
  year: z.string().optional().describe("Filter by year"),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional().describe("Filter by quarter"),

  // Pagination
  page: z.string().default('1').describe("Page number for pagination"),
  limit: z.string().default('20').describe("Number of items per page"),
});

export type InsertExecutionData = z.infer<typeof insertExecutionDataSchema>;
export type SelectExecutionData = z.infer<typeof selectExecutionDataSchema>;
export type PatchExecutionData = z.infer<typeof patchExecutionDataSchema>;
export type ExecutionListQuery = z.infer<typeof executionListQuerySchema>;
export type CalculateBalances = z.infer<typeof calculateBalancesSchema>;
export type BalancesResponse = z.infer<typeof balancesResponseSchema>;
export type QuarterlyValues = z.infer<typeof quarterlyValuesSchema>;

// Quarterly balance rollover schemas
export const closingBalancesSchema = z.object({
  D: z.record(z.string(), z.number()).describe("Section D (Financial Assets) closing balances by activity code"),
  E: z.record(z.string(), z.number()).describe("Section E (Financial Liabilities) closing balances by activity code"),
  VAT: z.record(z.string(), z.number()).describe("VAT Receivables closing balances by category code"),
});

export const balanceTotalsSchema = z.object({
  financialAssets: z.number().describe("Total Section D (Financial Assets)"),
  financialLiabilities: z.number().describe("Total Section E (Financial Liabilities)"),
  netFinancialAssets: z.number().describe("Net Financial Assets (D - E)"),
});

export const previousQuarterBalancesSchema = z.object({
  exists: z.boolean().describe("Whether previous quarter data exists"),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).nullable().describe("Previous quarter identifier"),
  executionId: z.number().int().nullable().describe("Previous quarter execution ID"),
  closingBalances: closingBalancesSchema.nullable().describe("Closing balances from previous quarter"),
  totals: balanceTotalsSchema.nullable().describe("Computed totals from previous quarter"),
});

export const quarterSequenceSchema = z.object({
  current: z.enum(["Q1", "Q2", "Q3", "Q4"]).describe("Current quarter"),
  previous: z.enum(["Q1", "Q2", "Q3", "Q4"]).nullable().describe("Previous quarter or null if Q1 (unless cross-fiscal-year rollover)"),
  next: z.enum(["Q1", "Q2", "Q3", "Q4"]).nullable().describe("Next quarter or null if Q4"),
  hasPrevious: z.boolean().describe("Whether a previous quarter exists"),
  hasNext: z.boolean().describe("Whether a next quarter exists"),
  isFirstQuarter: z.boolean().describe("Whether this is Q1"),
  isCrossFiscalYearRollover: z.boolean().optional().describe("Whether the previous quarter is from a different fiscal year (Q4 → Q1 rollover)"),
});

// Cascade recalculation impact metadata
export const cascadeImpactSchema = z.object({
  affectedQuarters: z.array(z.enum(["Q1", "Q2", "Q3", "Q4"])).describe("List of quarters affected by this update"),
  immediatelyRecalculated: z.array(z.enum(["Q1", "Q2", "Q3", "Q4"])).describe("Quarters recalculated synchronously"),
  queuedForRecalculation: z.array(z.enum(["Q1", "Q2", "Q3", "Q4"])).describe("Quarters queued for background recalculation"),
  status: z.enum(["none", "partial_complete", "complete"]).describe("Recalculation status"),
});

export const enhancedExecutionResponseSchema = z.object({
  entry: selectExecutionDataSchema.describe("Execution data entry"),
  ui: z.record(z.string(), z.any()).optional().describe("UI structure data"),
  previousQuarterBalances: previousQuarterBalancesSchema.describe("Previous quarter closing balances for rollover"),
  quarterSequence: quarterSequenceSchema.describe("Quarter navigation metadata"),
  cascadeImpact: cascadeImpactSchema.optional().describe("Cascade recalculation impact metadata"),
});

// Export TypeScript types from schemas
export type ClosingBalances = z.infer<typeof closingBalancesSchema>;
export type BalanceTotals = z.infer<typeof balanceTotalsSchema>;
export type PreviousQuarterBalances = z.infer<typeof previousQuarterBalancesSchema>;
export type QuarterSequence = z.infer<typeof quarterSequenceSchema>;
export type CascadeImpact = z.infer<typeof cascadeImpactSchema>;
export type EnhancedExecutionResponse = z.infer<typeof enhancedExecutionResponseSchema>;

// District information for admin users
export interface DistrictInfo {
  id: number;
  name: string;
}

// Extended execution data with district information for admin users
export interface ExecutionDataWithDistrict extends SelectExecutionData {
  district?: DistrictInfo | null;
}

// Schema for execution data that may include district information (for admin users)
export const selectExecutionDataWithDistrictSchema = selectExecutionDataSchema.extend({
  district: z.object({
    id: z.number().int().describe("District ID"),
    name: z.string().describe("District name"),
  }).nullable().optional().describe("District information (only available for admin users)"),
});

// Execution list response filters
export interface ExecutionListFilters {
  facilityType?: string;
  projectType?: string;
  reportingPeriod?: string;
  quarter?: string;
  district?: string; // Only present for admin users when filter applied
}

// Compiled execution aggregation schemas
export const compiledExecutionQuerySchema = z.object({
  scope: z.enum(['district', 'provincial', 'country']).optional().default('district')
    .describe("Organizational scope for aggregation (district, provincial, or country)"),
  provinceId: z.coerce.number().int().optional()
    .describe("Province ID (required for provincial scope)"),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional()
    .describe("Filter by project type (HIV, Malaria, or TB)"),
  facilityType: z.enum(['hospital', 'health_center']).optional()
    .describe("Filter by facility type (hospital or health_center)"),
  reportingPeriodId: z.coerce.number().int().optional()
    .describe("Filter by specific reporting period ID"),
  year: z.coerce.number().int().optional()
    .describe("Filter by year (e.g., 2024)"),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional()
    .describe("Filter by quarter (Q1, Q2, Q3, or Q4)"),
  districtId: z.coerce.number().int().optional()
    .describe("Filter by district ID (admin override for district scope)"),
});

export const facilityColumnSchema = z.object({
  id: z.number().int().describe("Unique facility identifier"),
  name: z.string().describe("Facility name"),
  facilityType: z.string().describe("Type of facility (hospital, health_center)"),
  projectType: z.string().describe("Project type (HIV, Malaria, TB)"),
  hasData: z.boolean().describe("Whether this facility has execution data"),
});

// Define ActivityRow interface first for recursive reference
export interface ActivityRow {
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  displayOrder: number;
  isSection: boolean;
  isSubcategory: boolean;
  isComputed: boolean;
  computationFormula?: string;
  values: Record<string, number>; // facilityId -> value
  total: number;
  level: number; // 0=section, 1=subcategory, 2=activity
  items?: ActivityRow[]; // nested items for hierarchical structure
}

// Base schema without recursion for OpenAPI compatibility
const baseActivityRowSchema = z.object({
  code: z.string().describe("Activity code identifier"),
  name: z.string().describe("Human-readable activity name"),
  category: z.string().describe("Activity category (A-G)"),
  subcategory: z.string().optional().describe("Subcategory code if applicable"),
  displayOrder: z.number().describe("Order for display purposes"),
  isSection: z.boolean().describe("Whether this is a section header"),
  isSubcategory: z.boolean().describe("Whether this is a subcategory header"),
  isComputed: z.boolean().describe("Whether values are computed vs. entered"),
  computationFormula: z.string().optional().describe("Formula used for computed values"),
  values: z.record(z.string(), z.number()).describe("Values by facility ID"),
  total: z.number().describe("Total value across all facilities"),
  level: z.number().describe("Hierarchy level: 0=section, 1=subcategory, 2=activity"),
});

// OpenAPI-friendly schema (flattened, no recursion)
export const activityRowSchema = baseActivityRowSchema.extend({
  items: z.array(baseActivityRowSchema).optional()
    .describe("Nested child activities (one level deep for OpenAPI compatibility)"),
});

// Runtime schema with full recursion for actual validation
// Note: Use this for runtime validation, not for OpenAPI schemas
export const activityRowSchemaRecursive: z.ZodType<ActivityRow> = z.lazy(() => 
  baseActivityRowSchema.extend({
    items: z.array(activityRowSchemaRecursive).optional(),
  })
);

// Note: The activityRowSchema (non-recursive) is used in OpenAPI schemas to avoid
// circular reference issues that can cause OpenAPI generators to fail or produce
// incorrect documentation. The recursive version is available for runtime validation
// if needed, but the flattened version should be sufficient for most use cases.

export const sectionSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  total: z.number(),
  isComputed: z.boolean(),
  computationFormula: z.string().optional(),
});

export const facilityTotalsSchema = z.object({
  byFacility: z.record(z.string(), z.number()),
  grandTotal: z.number(),
});

export const appliedFiltersSchema = z.object({
  scope: z.string().optional(),
  provinceId: z.number().optional(),
  projectType: z.string().optional(),
  facilityType: z.string().optional(),
  reportingPeriodId: z.number().optional(),
  year: z.number().optional(),
  quarter: z.string().optional(),
  districtId: z.number().optional(),
});

export const scopeDetailsSchema = z.object({
  districtId: z.number().optional()
    .describe("District ID for single district scope"),
  districtName: z.string().optional()
    .describe("District name for single district scope"),
  districtIds: z.array(z.number()).optional()
    .describe("List of district IDs included in the scope"),
  districtNames: z.array(z.string()).optional()
    .describe("List of district names included in the scope"),
  provinceId: z.number().optional()
    .describe("Province ID for provincial scope"),
  provinceName: z.string().optional()
    .describe("Province name for provincial scope"),
  provinceCount: z.number().optional()
    .describe("Total number of provinces for country scope"),
  districtCount: z.number().optional()
    .describe("Total number of districts in the scope"),
});

export const compiledExecutionResponseSchema = z.object({
  data: z.object({
    facilities: z.array(facilityColumnSchema),
    activities: z.array(activityRowSchema),
    sections: z.array(sectionSummarySchema),
    totals: facilityTotalsSchema,
  }),
  meta: z.object({
    filters: appliedFiltersSchema,
    aggregationDate: z.string(),
    facilityCount: z.number(),
    reportingPeriod: z.string(),
    scope: z.enum(['district', 'provincial', 'country'])
      .describe("The organizational scope used for this aggregation"),
    scopeDetails: scopeDetailsSchema.optional()
      .describe("Detailed information about the geographic scope"),
    performanceWarning: z.string().optional()
      .describe("Warning message for large datasets or performance considerations"),
  }),
});

export type CompiledExecutionQuery = z.infer<typeof compiledExecutionQuerySchema>;
export type FacilityColumn = z.infer<typeof facilityColumnSchema>;
// ActivityRow interface is defined above
export type SectionSummary = z.infer<typeof sectionSummarySchema>;
export type FacilityTotals = z.infer<typeof facilityTotalsSchema>;
export type AppliedFilters = z.infer<typeof appliedFiltersSchema>;
export type ScopeDetails = z.infer<typeof scopeDetailsSchema>;
export type CompiledExecutionResponse = z.infer<typeof compiledExecutionResponseSchema>;

// Multi-catalog support interfaces
export interface ActivityDefinition {
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  displayOrder: number;
  isSection: boolean;
  isSubcategory: boolean;
  isComputed: boolean;
  computationFormula?: string;
  level: number;
}

export interface ActivityCatalogMap {
  [facilityType: string]: ActivityDefinition[];
}

export interface FacilityCatalogMapping {
  [facilityId: string]: ActivityDefinition[];
}

// Unified activity structure for multi-catalog support
export interface UnifiedActivity extends ActivityDefinition {
  facilityTypes: string[]; // Which facility types have this activity
  sourceCode?: string; // Original code if normalized
}
