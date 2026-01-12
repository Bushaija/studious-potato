// computation/computation.types.ts
import { z } from "@hono/zod-openapi";

// Base computation schemas
export const calculateValuesSchema = z.object({
  schemaId: z.number().int(),
  data: z.record(z.string(), z.any()),
  calculations: z.array(z.object({
    fieldId: z.string(),
    formula: z.string(),
    dependencies: z.array(z.string()),
  })).optional(),
});

export const calculationStepSchema = z.object({
  fieldId: z.string(),
  formula: z.string(),
  inputs: z.record(z.string(), z.any()),
  result: z.any(),
  executionTime: z.number(),
  error: z.string().optional(),
});

export const calculateValuesResponseSchema = z.object({
  computedValues: z.record(z.string(), z.any()),
  calculationTrace: z.array(calculationStepSchema),
  errors: z.array(z.object({
    fieldId: z.string(),
    message: z.string(),
    code: z.string(),
  })),
  warnings: z.array(z.object({
    fieldId: z.string(),
    message: z.string(),
    code: z.string(),
  })),
});

// Aggregation schemas
export const aggregateTotalsSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  aggregationRules: z.array(z.object({
    fieldId: z.string(),
    aggregationType: z.enum(['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'MEDIAN']),
    sourceFields: z.array(z.string()),
    filters: z.record(z.string(), z.any()).optional(),
  })),
});

export const aggregationResultSchema = z.object({
  aggregatedValues: z.record(z.string(), z.number()),
  itemCount: z.number(),
  processedFields: z.array(z.string()),
});

// Variance analysis schemas
export const varianceAnalysisSchema = z.object({
  plannedData: z.record(z.string(), z.any()),
  actualData: z.record(z.string(), z.any()),
  analysisType: z.enum(['budget_vs_actual', 'quarter_vs_quarter', 'year_over_year']),
  toleranceThreshold: z.number().default(0.05), // 5% default tolerance
});

export const varianceResultSchema = z.object({
  fieldId: z.string(),
  planned: z.number(),
  actual: z.number(),
  variance: z.number(),
  percentageVariance: z.number(),
  isSignificant: z.boolean(),
  status: z.enum(['over_budget', 'under_budget', 'on_track']),
});

export const varianceAnalysisResponseSchema = z.object({
  summary: z.object({
    totalVariance: z.number(),
    averageVariance: z.number(),
    significantVariances: z.number(),
    overBudgetItems: z.number(),
    underBudgetItems: z.number(),
  }),
  fieldAnalysis: z.array(varianceResultSchema),
  recommendations: z.array(z.object({
    fieldId: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    message: z.string(),
    suggestedAction: z.string(),
  })),
});

// Formula validation schemas
export const validateFormulaSchema = z.object({
  formula: z.string(),
  context: z.object({
    availableFields: z.array(z.string()),
    functions: z.array(z.string()).optional(),
    testData: z.record(z.string(), z.any()).optional(),
  }),
});

export const formulaValidationResponseSchema = z.object({
  isValid: z.boolean(),
  syntax: z.object({
    isValidSyntax: z.boolean(),
    syntaxErrors: z.array(z.string()),
  }),
  dependencies: z.object({
    requiredFields: z.array(z.string()),
    missingFields: z.array(z.string()),
    circularDependencies: z.array(z.string()),
  }),
  testResult: z.object({
    result: z.any(),
    executionTime: z.number(),
    error: z.string().optional(),
  }).optional(),
  warnings: z.array(z.string()),
});

// Financial calculation schemas
export const calculateFinancialRatiosSchema = z.object({
  data: z.record(z.string(), z.any()),
  ratios: z.array(z.enum([
    'current_ratio', 'quick_ratio', 'debt_to_equity', 'return_on_assets',
    'budget_execution_rate', 'expenditure_ratio', 'surplus_ratio'
  ])),
});

export const financialRatioResultSchema = z.object({
  ratioName: z.string(),
  value: z.number(),
  formula: z.string(),
  interpretation: z.string(),
  benchmark: z.number().optional(),
  status: z.enum(['excellent', 'good', 'fair', 'poor']),
});

export type CalculateValues = z.infer<typeof calculateValuesSchema>;
export type CalculateValuesResponse = z.infer<typeof calculateValuesResponseSchema>;
export type AggregateTotals = z.infer<typeof aggregateTotalsSchema>;
export type AggregationResult = z.infer<typeof aggregationResultSchema>;
export type VarianceAnalysis = z.infer<typeof varianceAnalysisSchema>;
export type VarianceAnalysisResponse = z.infer<typeof varianceAnalysisResponseSchema>;
export type ValidateFormula = z.infer<typeof validateFormulaSchema>;
export type FormulaValidationResponse = z.infer<typeof formulaValidationResponseSchema>;
