import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import {
  budgetExecutionRatesRequestSchema,
  budgetExecutionRatesResponseSchema,
  // varianceTrendsRequestSchema,
  // varianceTrendsResponseSchema,
  // complianceStatusRequestSchema,
  // complianceStatusResponseSchema,
  // performanceMetricsRequestSchema,
  // performanceMetricsResponseSchema
} from "./analytics.types";

const tags = ["analytics"];

export const getBudgetExecutionRates = createRoute({
  path: "/analytics/budget-execution-rates",
  method: "get",
  tags,
  request: {
    query: budgetExecutionRatesRequestSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      budgetExecutionRatesResponseSchema,
      "Budget execution rates"
    )
  }
});

// export const getVarianceTrends = createRoute({
//   path: "/analytics/variance-trends",
//   method: "get",
//   tags,
//   request: {
//     query: varianceTrendsRequestSchema
//   },
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       varianceTrendsResponseSchema,
//       "Variance trends analysis"
//     )
//   }
// });

// export const getComplianceStatus = createRoute({
//   path: "/analytics/compliance-status",
//   method: "get",
//   tags,
//   request: {
//     query: complianceStatusRequestSchema
//   },
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       complianceStatusResponseSchema,
//       "Compliance status report"
//     )
//   }
// });

// export const getPerformanceMetrics = createRoute({
//   path: "/analytics/performance-metrics",
//   method: "get",
//   tags,
//   request: {
//     query: performanceMetricsRequestSchema
//   },
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       performanceMetricsResponseSchema,
//       "Performance metrics"
//     )
//   }
// });

export type GetBudgetExecutionRatesRoute = typeof getBudgetExecutionRates;
// export type GetVarianceTrendsRoute = typeof getVarianceTrends;
// export type GetComplianceStatusRoute = typeof getComplianceStatus;
// export type GetPerformanceMetricsRoute = typeof getPerformanceMetrics;