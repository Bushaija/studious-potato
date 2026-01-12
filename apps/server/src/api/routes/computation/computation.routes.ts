import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { 
  calculateValuesSchema,
  calculateValuesResponseSchema,
  aggregateTotalsSchema,
  aggregationResultSchema,
  varianceAnalysisSchema,
  varianceAnalysisResponseSchema,
  validateFormulaSchema,
  formulaValidationResponseSchema,
  calculateFinancialRatiosSchema,
  financialRatioResultSchema
} from "./computation.types";

const tags = ["computation"];

export const calculateValues = createRoute({
  path: "/computation/calculate-values",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(calculateValuesSchema, "Data and formulas for calculation"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      calculateValuesResponseSchema,
      "Calculated values with trace"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string(), errors: z.array(z.string()) }),
      "Calculation error"
    ),
  },
});

export const aggregateTotals = createRoute({
  path: "/computation/aggregate-totals",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(aggregateTotalsSchema, "Data for aggregation"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      aggregationResultSchema,
      "Aggregated totals"
    ),
  },
});

export const varianceAnalysis = createRoute({
  path: "/computation/variance-analysis",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(varianceAnalysisSchema, "Planned vs actual data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      varianceAnalysisResponseSchema,
      "Variance analysis results"
    ),
  },
});

export const validateFormula = createRoute({
  path: "/computation/validate-formula",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateFormulaSchema, "Formula to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      formulaValidationResponseSchema,
      "Formula validation results"
    ),
  },
});

export const calculateFinancialRatios = createRoute({
  path: "/computation/financial-ratios",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(calculateFinancialRatiosSchema, "Data for financial ratio calculation"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        ratios: z.array(financialRatioResultSchema),
        summary: z.object({
          overallScore: z.number(),
          riskLevel: z.enum(['low', 'medium', 'high']),
          keyInsights: z.array(z.string()),
        }),
      }),
      "Financial ratios analysis"
    ),
  },
});

export const optimizeFormulas = createRoute({
  path: "/computation/optimize-formulas",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        formulas: z.array(z.object({
          fieldId: z.string(),
          formula: z.string(),
          priority: z.enum(['high', 'medium', 'low']).default('medium'),
        })),
        optimizationGoals: z.array(z.enum(['performance', 'accuracy', 'maintainability'])),
      }),
      "Formulas to optimize"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        optimizedFormulas: z.array(z.object({
          fieldId: z.string(),
          originalFormula: z.string(),
          optimizedFormula: z.string(),
          improvementType: z.string(),
          performanceGain: z.number(),
          risks: z.array(z.string()),
        })),
        recommendations: z.array(z.string()),
      }),
      "Formula optimization results"
    ),
  },
});

export type CalculateValuesRoute = typeof calculateValues;
export type AggregateTotalsRoute = typeof aggregateTotals;
export type VarianceAnalysisRoute = typeof varianceAnalysis;
export type ValidateFormulaRoute = typeof validateFormula;
export type CalculateFinancialRatiosRoute = typeof calculateFinancialRatios;
export type OptimizeFormulasRoute = typeof optimizeFormulas;