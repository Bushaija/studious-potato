import { z } from "@hono/zod-openapi";
import { statementCodeEnum, projectTypeEnum } from "./financial-reports.types";

/**
 * Request schema for creating a financial report from a generated statement
 * This creates a formal report record for approval workflow tracking
 */
export const createReportFromStatementRequestSchema = z.object({
  statementCode: statementCodeEnum,
  reportingPeriodId: z.number().int().positive(),
  projectType: projectTypeEnum,
  facilityId: z.number().int().positive().optional(),
  title: z.string().min(1).max(300).optional(),
  includeComparatives: z.boolean().default(true),
});

/**
 * Response schema returns the created financial report with its ID
 */
export const createReportFromStatementResponseSchema = z.object({
  reportId: z.number().int(),
  message: z.string(),
  report: z.object({
    id: z.number().int(),
    reportCode: z.string(),
    title: z.string(),
    status: z.string(),
    createdAt: z.string(),
    projectId: z.number().int(),
    facilityId: z.number().int(),
    reportingPeriodId: z.number().int(),
  }),
});

export type CreateReportFromStatementRequest = z.infer<typeof createReportFromStatementRequestSchema>;
export type CreateReportFromStatementResponse = z.infer<typeof createReportFromStatementResponseSchema>;
