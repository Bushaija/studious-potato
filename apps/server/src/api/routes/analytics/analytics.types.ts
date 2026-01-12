import { z } from "@hono/zod-openapi";

// Budget Execution Rates
export const budgetExecutionRatesRequestSchema = z.object({
  projectId: z.number().int().optional(),
  facilityId: z.number().int().optional(),
  reportingPeriodId: z.number().int().optional(),
  groupBy: z.enum(['project', 'facility', 'category', 'quarter']).default('project'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional()
});

export const budgetExecutionRatesResponseSchema = z.object({
  overall: z.object({
    planned: z.number(),
    executed: z.number(),
    rate: z.number(),
    variance: z.number()
  }),
  breakdown: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    planned: z.number(),
    executed: z.number(),
    rate: z.number(),
    variance: z.number(),
    trend: z.enum(['up', 'down', 'stable'])
  })),
  byQuarter: z.object({
    q1: z.object({ planned: z.number(), executed: z.number(), rate: z.number() }),
    q2: z.object({ planned: z.number(), executed: z.number(), rate: z.number() }),
    q3: z.object({ planned: z.number(), executed: z.number(), rate: z.number() }),
    q4: z.object({ planned: z.number(), executed: z.number(), rate: z.number() })
  })
});

// Variance Trends
export const varianceTrendsRequestSchema = z.object({
  projectId: z.number().int().optional(),
  facilityId: z.number().int().optional(),
  periodCount: z.number().int().min(1).max(12).default(6),
  metricType: z.enum(['budget', 'revenue', 'expense']).default('budget')
});

export const varianceTrendsResponseSchema = z.object({
  trends: z.array(z.object({
    period: z.string(),
    planned: z.number(),
    actual: z.number(),
    variance: z.number(),
    variancePercent: z.number()
  })),
  summary: z.object({
    averageVariance: z.number(),
    maxVariance: z.number(),
    minVariance: z.number(),
    trendDirection: z.enum(['improving', 'deteriorating', 'stable'])
  })
});

// Compliance Status
export const complianceStatusRequestSchema = z.object({
  facilityId: z.number().int().optional(),
  projectId: z.number().int().optional(),
  checkType: z.enum(['all', 'submission', 'validation', 'approval']).default('all')
});

export const complianceStatusResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  status: z.enum(['compliant', 'partial', 'non-compliant']),
  checks: z.array(z.object({
    checkName: z.string(),
    status: z.enum(['pass', 'fail', 'warning']),
    score: z.number(),
    details: z.string().optional()
  })),
  recommendations: z.array(z.string())
});

// Performance Metrics
export const performanceMetricsRequestSchema = z.object({
  metricType: z.enum(['efficiency', 'effectiveness', 'quality', 'timeliness']),
  entityType: z.enum(['facility', 'project', 'user']),
  entityId: z.number().int().optional(),
  periodId: z.number().int().optional()
});

export const performanceMetricsResponseSchema = z.object({
  metrics: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string(),
    target: z.number().optional(),
    performance: z.number(), // percentage of target achieved
    trend: z.array(z.object({
      period: z.string(),
      value: z.number()
    }))
  })),
  score: z.number(),
  ranking: z.number().optional()
});