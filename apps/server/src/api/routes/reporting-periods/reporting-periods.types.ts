import { z } from "@hono/zod-openapi";

// Base schemas for reporting periods
export const insertReportingPeriodSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2050),
  periodType: z.string().default('ANNUAL'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.string().default('ACTIVE'),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: "Start date must be before end date",
    path: ["startDate"],
  }
);

export const selectReportingPeriodSchema = z.object({
  id: z.number().int(),
  year: z.number().int(),
  periodType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchReportingPeriodSchema = insertReportingPeriodSchema.partial();

// Query parameters for filtering
export const reportingPeriodsQuerySchema = z.object({
  year: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  periodType: z.string().optional(),
  status: z.string().optional(),
  startYear: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  endYear: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 50),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
});

// Response schemas
export const reportingPeriodsListSchema = z.object({
  data: z.array(selectReportingPeriodSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const reportingPeriodStatsSchema = z.object({
  totalPeriods: z.number(),
  activePeriods: z.number(),
  yearRange: z.object({
    earliest: z.number(),
    latest: z.number(),
  }),
  periodTypeDistribution: z.record(z.string(), z.number()),
});

// Type exports
export type InsertReportingPeriod = z.infer<typeof insertReportingPeriodSchema>;
export type SelectReportingPeriod = z.infer<typeof selectReportingPeriodSchema>;
export type PatchReportingPeriod = z.infer<typeof patchReportingPeriodSchema>;
export type ReportingPeriodsQuery = z.infer<typeof reportingPeriodsQuerySchema>;
export type ReportingPeriodsListResponse = z.infer<typeof reportingPeriodsListSchema>;
export type ReportingPeriodStats = z.infer<typeof reportingPeriodStatsSchema>;