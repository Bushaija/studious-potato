import { z } from "@hono/zod-openapi";

// Base DTOs
export const facilityDashboardSchema = z.object({
  total: z.number(),
  byType: z.record(z.string(), z.number()),
  byDistrict: z.record(z.string(), z.number()),
});

export const projectDashboardSchema = z.object({
  total: z.number(),
  byType: z.record(z.string(), z.number()),
  byStatus: z.record(z.string(), z.number()),
});

export const alertSchema = z.object({
  id: z.number(),
  type: z.enum(['warning', 'error', 'info']),
  title: z.string(),
  message: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  entityType: z.string().optional(),
  entityId: z.number().optional(),
  createdAt: z.string(),
});

export const financialReportDTOSchema = z.object({
  id: z.number(),
  reportCode: z.string(),
  title: z.string(),
  projectName: z.string(),
  facilityName: z.string(),
  fiscalYear: z.string(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
  createdBy: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().optional(),
});

export const reportsDashboardSchema = z.object({
  total: z.number(),
  byStatus: z.record(z.string(), z.number()),
  pendingApproval: z.number(),
  recentlySubmitted: z.array(financialReportDTOSchema),
});

export const dashboardSummaryResponseSchema = z.object({
  facilities: facilityDashboardSchema,
  projects: projectDashboardSchema,
  reports: reportsDashboardSchema,
  alerts: z.array(alertSchema),
});

// Analytics schemas
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const timeSeriesDataPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  label: z.string().optional(),
});

export const categoryDataPointSchema = z.object({
  category: z.string(),
  value: z.number(),
  percentage: z.number().optional(),
});

export const reportingTrendSchema = z.object({
  period: z.string(),
  submitted: z.number(),
  approved: z.number(),
  rejected: z.number(),
  pending: z.number(),
});

export const facilityPerformanceSchema = z.object({
  facilityId: z.number(),
  facilityName: z.string(),
  districtName: z.string(),
  totalReports: z.number(),
  onTimeSubmissions: z.number(),
  lateSubmissions: z.number(),
  averageProcessingTime: z.number(), // in days
  complianceRate: z.number(), // percentage
});

export const projectAnalyticsSchema = z.object({
  projectId: z.number(),
  projectName: z.string(),
  projectType: z.string(),
  totalBudget: z.number(),
  executedBudget: z.number(),
  remainingBudget: z.number(),
  executionRate: z.number(), // percentage
  facilitiesCount: z.number(),
});

export const analyticsOverviewSchema = z.object({
  reportingTrends: z.array(reportingTrendSchema),
  facilityPerformance: z.array(facilityPerformanceSchema),
  projectAnalytics: z.array(projectAnalyticsSchema),
  budgetUtilization: z.object({
    total: z.number(),
    utilized: z.number(),
    remaining: z.number(),
    utilizationRate: z.number(),
  }),
  complianceMetrics: z.object({
    overallCompliance: z.number(),
    onTimeSubmissions: z.number(),
    lateSubmissions: z.number(),
    averageSubmissionDelay: z.number(), // in days
  }),
});

// Query parameter schemas
export const dashboardQuerySchema = z.object({
  facilityId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
  reportingPeriodId: z.coerce.number().optional(),
});

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  districtId: z.coerce.number().optional(),
  provinceId: z.coerce.number().optional(),
});

export const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv', 'pdf']).default('xlsx'),
  reportType: z.enum(['summary', 'detailed', 'trends']).default('summary'),
  includeCharts: z.boolean().default(false),
});

// Type exports
export type FacilityDashboard = z.infer<typeof facilityDashboardSchema>;
export type ProjectDashboard = z.infer<typeof projectDashboardSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type FinancialReportDTO = z.infer<typeof financialReportDTOSchema>;
export type ReportsDashboard = z.infer<typeof reportsDashboardSchema>;
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type FacilityPerformance = z.infer<typeof facilityPerformanceSchema>;
export type ProjectAnalytics = z.infer<typeof projectAnalyticsSchema>;
export type ReportingTrend = z.infer<typeof reportingTrendSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;