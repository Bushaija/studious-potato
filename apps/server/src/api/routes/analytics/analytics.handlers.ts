import { eq, and } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { db } from "@/api/db";
import {
  projects,
  schemaFormDataEntries,
} from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  GetBudgetExecutionRatesRoute,
} from "./analytics.routes";


export const getBudgetExecutionRates: AppRouteHandler<GetBudgetExecutionRatesRoute> = async (c) => {
  const query = c.req.query();
  const { projectId, facilityId, reportingPeriodId, groupBy } = query;

  try {
    // Build conditions
    const conditions = [];
    if (projectId) conditions.push(eq(schemaFormDataEntries.projectId, parseInt(projectId)));
    if (facilityId) conditions.push(eq(schemaFormDataEntries.facilityId, parseInt(facilityId)));
    if (reportingPeriodId) conditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(reportingPeriodId)));

    // Fetch planning and execution data
    const planningData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        ...conditions,
        eq(schemaFormDataEntries.entityType, 'planning'),
        eq(schemaFormDataEntries.approvalStatus, 'APPROVED')
      )
    });

    const executionData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        ...conditions,
        eq(schemaFormDataEntries.entityType, 'execution')
      )
    });

    // Calculate rates
    const calculateRates = (planned: number, executed: number) => ({
      planned,
      executed,
      rate: planned > 0 ? (executed / planned) * 100 : 0,
      variance: executed - planned
    });

    // Calculate overall rates
    const totalPlanned = planningData.reduce((sum, item) => {
      const values = item.computedValues as any;
      return sum + (values?.total || 0);
    }, 0);

    const totalExecuted = executionData.reduce((sum, item) => {
      const values = item.computedValues as any;
      return sum + (values?.total || 0);
    }, 0);

    // Calculate quarterly breakdown
    const quarterlyData = {
      q1: calculateRates(
        planningData.reduce((sum, item) => sum + ((item.formData as any)?.q1 || 0), 0),
        executionData.reduce((sum, item) => sum + ((item.formData as any)?.q1 || 0), 0)
      ),
      q2: calculateRates(
        planningData.reduce((sum, item) => sum + ((item.formData as any)?.q2 || 0), 0),
        executionData.reduce((sum, item) => sum + ((item.formData as any)?.q2 || 0), 0)
      ),
      q3: calculateRates(
        planningData.reduce((sum, item) => sum + ((item.formData as any)?.q3 || 0), 0),
        executionData.reduce((sum, item) => sum + ((item.formData as any)?.q3 || 0), 0)
      ),
      q4: calculateRates(
        planningData.reduce((sum, item) => sum + ((item.formData as any)?.q4 || 0), 0),
        executionData.reduce((sum, item) => sum + ((item.formData as any)?.q4 || 0), 0)
      )
    };

    // Group by logic (simplified for demo)
    const breakdown = [];
    if (groupBy === 'project') {
      const allProjects = await db.query.projects.findMany({
        where: projectId ? eq(projects.id, parseInt(projectId)) : undefined
      });

      for (const project of allProjects) {
        const projectPlanned = planningData
          .filter(d => d.projectId === project.id)
          .reduce((sum, item) => sum + ((item.computedValues as any)?.total || 0), 0);
        
        const projectExecuted = executionData
          .filter(d => d.projectId === project.id)
          .reduce((sum, item) => sum + ((item.computedValues as any)?.total || 0), 0);

        breakdown.push({
          id: project.id,
          name: project.name,
          ...calculateRates(projectPlanned, projectExecuted),
          trend: 'stable' as const
        });
      }
    }

    return c.json({
      overall: calculateRates(totalPlanned, totalExecuted),
      breakdown,
      byQuarter: quarterlyData
    });

  } catch (error) {
    return c.json(
      { message: "Failed to calculate budget execution rates" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// export const getVarianceTrends: AppRouteHandler<GetVarianceTrendsRoute> = async (c) => {
//   const query = c.req.query();
//   const { projectId, facilityId, periodCount, metricType } = query;

//   try {
//     // Get recent periods
//     const periods = await db.query.reportingPeriods.findMany({
//       orderBy: (periods, { desc }) => [desc(periods.year)],
//       limit: periodCount
//     });

//     const trends = [];
//     let totalVariance = 0;
//     let maxVariance = -Infinity;
//     let minVariance = Infinity;

//     for (const period of periods) {
//       const conditions = [eq(schemaFormDataEntries.reportingPeriodId, period.id)];
//       if (projectId) conditions.push(eq(schemaFormDataEntries.projectId, projectId));
//       if (facilityId) conditions.push(eq(schemaFormDataEntries.facilityId, facilityId));

//       const planningData = await db.query.schemaFormDataEntries.findMany({
//         where: and(...conditions, eq(schemaFormDataEntries.entityType, 'planning'))
//       });

//       const executionData = await db.query.schemaFormDataEntries.findMany({
//         where: and(...conditions, eq(schemaFormDataEntries.entityType, 'execution'))
//       });

//       const planned = planningData.reduce((sum, item) => 
//         sum + ((item.computedValues as any)?.total || 0), 0);
//       const actual = executionData.reduce((sum, item) => 
//         sum + ((item.computedValues as any)?.total || 0), 0);
//       const variance = actual - planned;
//       const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

//       trends.push({
//         period: `${period.year} ${period.periodType}`,
//         planned,
//         actual,
//         variance,
//         variancePercent
//       });

//       totalVariance += variance;
//       maxVariance = Math.max(maxVariance, variance);
//       minVariance = Math.min