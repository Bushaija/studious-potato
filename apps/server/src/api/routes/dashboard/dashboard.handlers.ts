import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"
import { db } from '@/db'
import * as schema from '@/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import type { AppRouteHandler } from "@/api/lib/types"
import { getUserContext } from '@/lib/utils/get-user-facility'
import type {
  GetAccountantFacilityOverviewRoute,
  GetAccountantTasksRoute,
  GetDashboardMetricsRoute,
  GetProgramDistributionRoute,
  GetBudgetByDistrictRoute,
  GetBudgetByFacilityRoute,
  GetProvinceApprovalSummaryRoute,
  GetDistrictApprovalDetailsRoute,
} from "./dashboard.routes"
import { 
  getCurrentReportingPeriod, 
  aggregateBudgetData,
  aggregateByDistrict,
  aggregateByFacility,
  getAccessibleFacilitiesInProvince, 
  getAccessibleFacilitiesInDistrict,
  getAccessibleFacilitiesForFacility,
  validateProvinceAccess,
  validateDistrictAccess,
  fetchPlanningEntries,
  fetchExecutionEntries,
  calculateAllocatedBudget,
  calculateSpentBudget,
  calculateUtilization
} from '../../services/dashboard'

// Helper to calculate budget totals from form data
function calculateBudgetFromFormData(formData: any, entityType?: string): number {
  let total = 0;
  
  // Handle execution data structure (different from planning)
  if (entityType === 'execution' && formData.rollups && formData.rollups.bySection) {
    const bySection = formData.rollups.bySection;
    
    // Sum up all section totals
    Object.values(bySection).forEach((section: any) => {
      if (section && typeof section === 'object' && typeof section.total === 'number') {
        total += section.total;
      }
    });
  }
  
  // Handle planning data structure (activities with total_budget)
  else if (formData.activities && typeof formData.activities === 'object') {
    Object.values(formData.activities).forEach((activity: any) => {
      if (activity && typeof activity === 'object') {
        // Check for total_budget first (most common in planning)
        if (activity.total_budget && typeof activity.total_budget === 'number') {
          total += activity.total_budget;
        }
        // Fallback to other budget fields
        else if (activity.budget && typeof activity.budget === 'number') {
          total += activity.budget;
        }
        else if (activity.amount && typeof activity.amount === 'number') {
          total += activity.amount;
        }
        // For execution activities, check cumulative_balance
        else if (activity.cumulative_balance && typeof activity.cumulative_balance === 'number') {
          total += activity.cumulative_balance;
        }
        else {
          console.log('No budget field found in activity');
        }
      }
    });
  }
  
  // Handle activities as an array (fallback for different form structures)
  else if (formData.activities && Array.isArray(formData.activities)) {
    formData.activities.forEach((activity: any) => {
      if (activity && typeof activity === 'object') {
        if (activity.total_budget && typeof activity.total_budget === 'number') {
          total += activity.total_budget;
        }
        else if (activity.budget && typeof activity.budget === 'number') {
          total += activity.budget;
        }
        else if (activity.amount && typeof activity.amount === 'number') {
          total += activity.amount;
        }
        else if (activity.cumulative_balance && typeof activity.cumulative_balance === 'number') {
          total += activity.cumulative_balance;
        }
        else {
          console.log('No budget field found in activity');
        }
      }
    });
  }
  else {
    console.log('No activities or rollups found, or activities is neither object nor array');
  }
  
  return total;
}

// Get Accountant Facility Overview (Legacy - Deprecated)
// This endpoint is deprecated. Use /api/dashboard/metrics instead.
export const getAccountantFacilityOverview: AppRouteHandler<GetAccountantFacilityOverviewRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    
    const { facilityId: queryFacilityId } = c.req.query();
    
    // Determine which facility/facilities to query
    let targetFacilityId: number;
    let facilityIds: number[];
    
    if (queryFacilityId) {
      // Validate that user has access to the requested facility
      const requestedFacilityId = parseInt(queryFacilityId);
      if (!userContext.accessibleFacilityIds.includes(requestedFacilityId)) {
        throw new HTTPException(403, { message: 'Access denied to this facility' });
      }
      targetFacilityId = requestedFacilityId;
      facilityIds = [requestedFacilityId];
    } else {
      // Use user's facility and all accessible facilities (district-based)
      targetFacilityId = userContext.facilityId;
      facilityIds = userContext.accessibleFacilityIds;
    }
    
    // Get current reporting period using new service
    const currentPeriod = await getCurrentReportingPeriod();

    if (!currentPeriod) {
      throw new HTTPException(404, { message: 'No active reporting period found' });
    }

    // Get facility details (primary facility for display)
    const facility = await db.query.facilities.findFirst({
      where: eq(schema.facilities.id, targetFacilityId),
    });

    if (!facility) {
      throw new HTTPException(404, { message: 'Facility not found' });
    }

    // Use new service layer to fetch planning and execution entries
    const planningEntries = await fetchPlanningEntries({
      facilityIds,
      reportingPeriodId: currentPeriod.id,
    });

    const executionEntries = await fetchExecutionEntries({
      facilityIds,
      reportingPeriodId: currentPeriod.id,
    });

    // Get unique project IDs from planning data
    const projectIdsWithPlanning = [...new Set(planningEntries.map(p => p.projectId))];

    // Fetch project details
    const projects = await db.query.projects.findMany({
      where: (projects, { inArray }) => inArray(projects.id, projectIdsWithPlanning)
    });

    const projectIdToProject = new Map(projects.map(p => [p.id, p]));

    // Calculate budget by project using new service functions
    const projectBreakdown = projectIdsWithPlanning.map(projectId => {
      const project = projectIdToProject.get(projectId);
      const projectPlanning = planningEntries.filter(p => p.projectId === projectId);
      const projectExecution = executionEntries.filter(e => e.projectId === projectId);

      const allocated = calculateAllocatedBudget(projectPlanning);
      const spent = calculateSpentBudget(projectExecution);
      const remaining = allocated - spent;
      const utilizationPercentage = calculateUtilization(allocated, spent);

      return {
        projectId,
        projectName: project?.name ?? `Project ${projectId}`,
        projectCode: project?.code ?? '',
        allocated,
        spent,
        remaining,
        utilizationPercentage,
      };
    });

    // Calculate totals using new service functions
    const totalAllocated = calculateAllocatedBudget(planningEntries);
    const totalSpent = calculateSpentBudget(executionEntries);
    const totalRemaining = totalAllocated - totalSpent;
    const utilizationPercentage = calculateUtilization(totalAllocated, totalSpent);

    const budgetSummary = {
      totalAllocated,
      totalSpent,
      totalRemaining,
      utilizationPercentage,
    };

    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard/metrics instead.');
    c.header('X-Deprecation-Date', '2025-01-26');

    return c.json({
      currentReportingPeriod: {
        id: currentPeriod.id,
        year: currentPeriod.year,
        periodType: currentPeriod.periodType || 'ANNUAL',
        startDate: new Date(currentPeriod.startDate).toISOString(),
        endDate: new Date(currentPeriod.endDate).toISOString(),
        status: currentPeriod.status || 'ACTIVE',
      },
      facility: {
        id: facility.id,
        name: facility.name,
        facilityType: facility.facilityType,
      },
      budgetSummary,
      projectBreakdown,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Get facility overview error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve facility overview' });
  }
};

// Get Accountant Tasks
export const getAccountantTasks: AppRouteHandler<GetAccountantTasksRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    
    const { facilityId: queryFacilityId } = c.req.query();
    
    // Determine which facilities to query
    let facilityIds: number[];
    
    if (queryFacilityId) {
      // Validate that user has access to the requested facility
      const requestedFacilityId = parseInt(queryFacilityId);
      if (!userContext.accessibleFacilityIds.includes(requestedFacilityId)) {
        throw new HTTPException(403, { message: 'Access denied to this facility' });
      }
      facilityIds = [requestedFacilityId];
    } else {
      // Use all accessible facilities (district-based)
      facilityIds = userContext.accessibleFacilityIds;
    }
    
    // Get current reporting period
    const currentPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(schema.reportingPeriods.status, 'ACTIVE'),
      orderBy: (reportingPeriods, { desc }) => [desc(reportingPeriods.year)],
    });

    if (!currentPeriod) {
      return c.json({
        pendingPlans: [],
        pendingExecutions: [],
        correctionsRequired: [],
        upcomingDeadlines: [],
      }, HttpStatusCodes.OK);
    }

    // Get all active projects for accessible facilities
    const projects = await db.query.projects.findMany({
      where: and(
        eq(schema.projects.reportingPeriodId, currentPeriod.id),
        eq(schema.projects.status, 'ACTIVE')
      ),
    });

    // Filter by accessible facilities
    const accessibleProjects = projects.filter(p => p.facilityId && facilityIds.includes(p.facilityId));

    // Get existing planning entries for accessible facilities
    const existingPlans = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'planning'),
        eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id)
      ),
    });

    const accessiblePlans = existingPlans.filter(p => facilityIds.includes(p.facilityId));

    // Get existing execution entries for accessible facilities
    const existingExecutions = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'execution'),
        eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id)
      ),
    });

    const accessibleExecutions = existingExecutions.filter(e => facilityIds.includes(e.facilityId));

    // Determine pending plans (projects without planning entries)
    const projectsWithPlans = new Set(accessiblePlans.map(p => p.projectId));
    const pendingPlans = accessibleProjects
      .filter(project => !projectsWithPlans.has(project.id))
      .map(project => ({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        reportingPeriodId: currentPeriod.id,
        reportingPeriodYear: currentPeriod.year,
        deadline: new Date(currentPeriod.endDate).toISOString(),
        status: 'PENDING',
      }));

    // Determine pending executions (projects with plans but missing execution for quarters)
    // Simplified: assuming quarterly execution, need at least 4 execution entries
    const executionsByProject = accessibleExecutions.reduce((acc, exec) => {
      if (!acc[exec.projectId]) acc[exec.projectId] = [];
      acc[exec.projectId].push(exec);
      return acc;
    }, {} as Record<number, any[]>);

    const pendingExecutions = accessibleProjects
      .filter(project => projectsWithPlans.has(project.id))
      .filter(project => {
        const executions = executionsByProject[project.id] || [];
        return executions.length < 4; // Assuming 4 quarters
      })
      .map(project => {
        const executions = executionsByProject[project.id] || [];
        const completedQuarters = executions.map(e => e.metadata?.quarter).filter(Boolean);
        const nextQuarter = [1, 2, 3, 4].find(q => !completedQuarters.includes(q)) || 1;
        
        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code,
          reportingPeriodId: currentPeriod.id,
          reportingPeriodYear: currentPeriod.year,
          quarter: nextQuarter,
          deadline: new Date(currentPeriod.endDate).toISOString(),
          status: 'PENDING',
        };
      });

    // Get entries requiring corrections (you might have a status field for this)
    // For now, returning empty array - implement based on your validation/approval workflow
    const correctionsRequired: any[] = [];

    // Calculate upcoming deadlines
    const now = new Date();
    const endDate = new Date(currentPeriod.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const upcomingDeadlines = [{
      reportingPeriodId: currentPeriod.id,
      year: currentPeriod.year,
      periodType: currentPeriod.periodType || 'ANNUAL',
      endDate: new Date(currentPeriod.endDate).toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
    }];

    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=tasks instead.');
    c.header('X-Deprecation-Date', '2025-01-26');

    return c.json({
      pendingPlans,
      pendingExecutions,
      correctionsRequired,
      upcomingDeadlines,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Get accountant tasks error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve tasks' });
  }
};

// Get Dashboard Metrics
export const getDashboardMetrics: AppRouteHandler<GetDashboardMetricsRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { level, provinceId, districtId, projectType, quarter } = c.req.query();
    
    // Validate required parameters based on level
    if (!level) {
      throw new HTTPException(400, { message: 'Level parameter is required (province or district)' });
    }
    
    if (level === 'province' && !provinceId) {
      throw new HTTPException(400, { message: 'provinceId is required when level is province' });
    }
    
    if (level === 'district' && !districtId) {
      throw new HTTPException(400, { message: 'districtId is required when level is district' });
    }
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        totalAllocated: 0,
        totalSpent: 0,
        remaining: 0,
        utilizationPercentage: 0,
        reportingPeriod: null,
      }, HttpStatusCodes.OK);
    }
    
    // Determine facility scope based on level parameter
    let facilityIds: number[];
    
    if (level === 'province') {
      const provinceIdNum = parseInt(provinceId!);
      
      // Validate user has access to this province
      await validateProvinceAccess(userContext, provinceIdNum);
      
      // Get accessible facilities in the province
      facilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceIdNum);
    } else {
      // level === 'district'
      const districtIdNum = parseInt(districtId!);
      
      // Validate user has access to this district
      await validateDistrictAccess(userContext, districtIdNum);
      
      // Get accessible facilities in the district
      facilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtIdNum);
    }
    
    // If no accessible facilities, return zeros
    if (facilityIds.length === 0) {
      return c.json({
        totalAllocated: 0,
        totalSpent: 0,
        remaining: 0,
        utilizationPercentage: 0,
        reportingPeriod: {
          id: currentPeriod.id,
          year: currentPeriod.year,
          periodType: currentPeriod.periodType || 'ANNUAL',
          startDate: new Date(currentPeriod.startDate).toISOString(),
          endDate: new Date(currentPeriod.endDate).toISOString(),
        },
      }, HttpStatusCodes.OK);
    }
    
    // Apply project type and quarter filters
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Fetch and aggregate planning and execution entries
    const metrics = await aggregateBudgetData({
      facilityIds,
      reportingPeriodId: currentPeriod.id,
      projectType: projectType,
      quarter: quarterNum,
    });
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=metrics instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      totalAllocated: metrics.allocated,
      totalSpent: metrics.spent,
      remaining: metrics.remaining,
      utilizationPercentage: metrics.utilizationPercentage,
      reportingPeriod: {
        id: currentPeriod.id,
        year: currentPeriod.year,
        periodType: currentPeriod.periodType || 'ANNUAL',
        startDate: new Date(currentPeriod.startDate).toISOString(),
        endDate: new Date(currentPeriod.endDate).toISOString(),
      },
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('Get dashboard metrics error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve dashboard metrics' });
  }
};

// Get Program Distribution
export const getProgramDistribution: AppRouteHandler<GetProgramDistributionRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { level, provinceId, districtId, quarter } = c.req.query();
    
    // Validate required parameters based on level
    if (!level) {
      throw new HTTPException(400, { message: 'Level parameter is required (province or district)' });
    }
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        programs: [],
        total: 0,
      }, HttpStatusCodes.OK);
    }
    
    // Determine facility scope based on level parameter
    let facilityIds: number[];
    
    if (level === 'province') {
      if (provinceId) {
        const provinceIdNum = parseInt(provinceId);
        
        // Validate user has access to this province
        await validateProvinceAccess(userContext, provinceIdNum);
        
        // Get accessible facilities in the province
        facilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceIdNum);
      } else {
        // No provinceId provided, use all accessible facilities
        facilityIds = userContext.accessibleFacilityIds;
      }
    } else {
      // level === 'district'
      if (districtId) {
        const districtIdNum = parseInt(districtId);
        
        // Validate user has access to this district
        await validateDistrictAccess(userContext, districtIdNum);
        
        // Get accessible facilities in the district
        facilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtIdNum);
      } else {
        // No districtId provided, use all accessible facilities
        facilityIds = userContext.accessibleFacilityIds;
      }
    }
    
    // If no accessible facilities, return empty
    if (facilityIds.length === 0) {
      return c.json({
        programs: [],
        total: 0,
      }, HttpStatusCodes.OK);
    }
    
    // Apply quarter filter
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Fetch planning entries for the facilities
    const planningConditions = [
      eq(schema.schemaFormDataEntries.entityType, 'planning'),
      eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id),
      eq(schema.schemaFormDataEntries.approvalStatus, 'APPROVED'),
    ];
    
    // Apply quarter filter if provided
    if (quarterNum !== undefined) {
      planningConditions.push(
        eq(schema.schemaFormDataEntries.metadata, { quarter: quarterNum })
      );
    }
    
    const planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(...planningConditions),
      with: {
        project: true,
      },
    });
    
    // Filter by accessible facilities
    const accessiblePlanningEntries = planningEntries.filter(entry => 
      facilityIds.includes(entry.facilityId)
    );
    
    // Group by project_type (program)
    const entriesByProgram = accessiblePlanningEntries.reduce((acc, entry) => {
      const programType = entry.project?.projectType || 'unknown';
      if (!acc[programType]) {
        acc[programType] = [];
      }
      acc[programType].push(entry);
      return acc;
    }, {} as Record<string, typeof accessiblePlanningEntries>);
    
    // Calculate allocated budget per program
    const programBudgets = Object.entries(entriesByProgram).map(([programType, entries]) => {
      const allocatedBudget = entries.reduce((sum, entry) => {
        const budget = calculateBudgetFromFormData(entry.formData, 'planning');
        return sum + budget;
      }, 0);
      
      // Get program name from first project (or use programType as fallback)
      const programName = entries[0]?.project?.name || `Program ${programType}`;
      
      return {
        programId: parseInt(programType) || 0,
        programName,
        allocatedBudget,
      };
    });
    
    // Calculate total
    const total = programBudgets.reduce((sum, program) => sum + program.allocatedBudget, 0);
    
    // Calculate percentage of total
    const programsWithPercentage = programBudgets.map(program => ({
      ...program,
      percentage: total > 0 ? Math.round((program.allocatedBudget / total) * 100 * 100) / 100 : 0,
    }));
    
    // Sort by allocated budget descending
    const sortedPrograms = programsWithPercentage.sort((a, b) => b.allocatedBudget - a.allocatedBudget);
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=programDistribution instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      programs: sortedPrograms,
      total,
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('Get program distribution error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve program distribution' });
  }
};

// Get Budget by District
export const getBudgetByDistrict: AppRouteHandler<GetBudgetByDistrictRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { provinceId, projectType, quarter } = c.req.query();
    
    // Validate required parameters
    if (!provinceId) {
      throw new HTTPException(400, { message: 'provinceId parameter is required' });
    }
    
    const provinceIdNum = parseInt(provinceId);
    
    // Validate user has access to this province
    await validateProvinceAccess(userContext, provinceIdNum);
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        districts: [],
      }, HttpStatusCodes.OK);
    }
    
    // Get accessible facilities in the province
    const facilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceIdNum);
    
    // If no accessible facilities, return empty
    if (facilityIds.length === 0) {
      return c.json({
        districts: [],
      }, HttpStatusCodes.OK);
    }
    
    // Apply project type and quarter filters
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Aggregate budget data by district
    const districtBudgets = await aggregateByDistrict(
      provinceIdNum,
      facilityIds,
      currentPeriod.id,
      projectType,
      quarterNum
    );
    
    // Transform to response format
    const districts = districtBudgets.map(district => ({
      districtId: district.districtId,
      districtName: district.districtName,
      allocatedBudget: district.allocated,
      spentBudget: district.spent,
      utilizationPercentage: district.utilizationPercentage,
    }));
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=budgetByDistrict instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      districts,
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('Get budget by district error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve budget by district' });
  }
};

// Get Budget by Facility
export const getBudgetByFacility: AppRouteHandler<GetBudgetByFacilityRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { districtId, facilityId, projectType, quarter } = c.req.query();
    
    console.log('[getBudgetByFacility] Query params:', { districtId, facilityId, projectType, quarter });
    
    // Validate required parameters - either districtId or facilityId must be provided
    if (!districtId && !facilityId) {
      throw new HTTPException(400, { message: 'Either districtId or facilityId parameter is required' });
    }
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        facilities: [],
      }, HttpStatusCodes.OK);
    }
    
    // Get accessible facilities based on scope
    let facilityIds: number[];
    let scopeId: number;
    
    if (facilityId) {
      // Facility-level scope: get facility and its children
      const facilityIdNum = parseInt(facilityId);
      console.log('[getBudgetByFacility] Using facility scope:', facilityIdNum);
      facilityIds = await getAccessibleFacilitiesForFacility(userContext, facilityIdNum);
      scopeId = facilityIdNum;
      console.log('[getBudgetByFacility] Accessible facility IDs:', facilityIds);
      
      // Validate user has access to at least one facility
      if (facilityIds.length === 0) {
        throw new HTTPException(403, { message: 'Access denied: You do not have access to this facility' });
      }
    } else {
      // District-level scope: get all facilities in district
      const districtIdNum = parseInt(districtId!);
      console.log('[getBudgetByFacility] Using district scope:', districtIdNum);
      
      // Validate user has access to this district
      await validateDistrictAccess(userContext, districtIdNum);
      
      facilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtIdNum);
      scopeId = districtIdNum;
      console.log('[getBudgetByFacility] Accessible facility IDs:', facilityIds);
    }
    
    // If no accessible facilities, return empty
    if (facilityIds.length === 0) {
      return c.json({
        facilities: [],
      }, HttpStatusCodes.OK);
    }
    
    // Apply project type and quarter filters
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Fetch facilities data
    console.log('[getBudgetByFacility] Fetching facilities:', facilityIds);
    const facilitiesData = facilityIds.length > 0 
      ? await db.query.facilities.findMany({
          where: inArray(schema.facilities.id, facilityIds),
        })
      : [];
    console.log('[getBudgetByFacility] Found facilities:', facilitiesData.length);

    // Aggregate budget for each facility
    const facilityBudgets = await Promise.all(
      facilitiesData.map(async (facility) => {
        console.log('[getBudgetByFacility] Aggregating budget for facility:', facility.id, facility.name);
        const budgetData = await aggregateBudgetData({
          facilityIds: [facility.id],
          reportingPeriodId: currentPeriod.id,
          projectType,
          quarter: quarterNum,
        });

        return {
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.facilityType,
          allocated: budgetData.allocated,
          spent: budgetData.spent,
          utilizationPercentage: budgetData.utilizationPercentage,
        };
      })
    );
    console.log('[getBudgetByFacility] Aggregated budgets:', facilityBudgets.length);

    // Sort by allocated budget descending
    const sortedFacilityBudgets = facilityBudgets.sort((a, b) => b.allocated - a.allocated);
    
    // Transform to response format
    const facilities = sortedFacilityBudgets.map(facility => ({
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      facilityType: facility.facilityType,
      allocatedBudget: facility.allocated,
      spentBudget: facility.spent,
      utilizationPercentage: facility.utilizationPercentage,
    }));
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=budgetByFacility instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      facilities,
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('[getBudgetByFacility] Error:', error);
    console.error('[getBudgetByFacility] Error stack:', error?.stack);
    console.error('[getBudgetByFacility] Error message:', error?.message);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: `Failed to retrieve budget by facility: ${error?.message || 'Unknown error'}` });
  }
};

// Get Province Approval Summary
export const getProvinceApprovalSummary: AppRouteHandler<GetProvinceApprovalSummaryRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { provinceId, projectType, quarter } = c.req.query();
    
    // Validate required parameters
    if (!provinceId) {
      throw new HTTPException(400, { message: 'provinceId parameter is required' });
    }
    
    const provinceIdNum = parseInt(provinceId);
    
    // Validate user has access to this province
    await validateProvinceAccess(userContext, provinceIdNum);
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        districts: [],
      }, HttpStatusCodes.OK);
    }
    
    // Get accessible facilities in the province
    const facilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceIdNum);
    
    // If no accessible facilities, return empty
    if (facilityIds.length === 0) {
      return c.json({
        districts: [],
      }, HttpStatusCodes.OK);
    }
    
    // Apply project type and quarter filters
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Get all districts in the province
    const provinceDistricts = await db.query.districts.findMany({
      where: eq(schema.districts.provinceId, provinceIdNum),
    });
    
    // Fetch all facilities properly
    const allDistrictFacilities = await db.query.facilities.findMany({
      where: eq(schema.facilities.status, 'ACTIVE'),
    });
    
    // Filter to only facilities in our districts and accessible to user
    const accessibleDistrictFacilities = allDistrictFacilities.filter(
      f => f.districtId && 
           provinceDistricts.some(d => d.id === f.districtId) &&
           facilityIds.includes(f.id)
    );
    
    // Group facilities by district
    const facilitiesByDistrict = accessibleDistrictFacilities.reduce((acc, facility) => {
      if (!facility.districtId) return acc;
      if (!acc[facility.districtId]) {
        acc[facility.districtId] = [];
      }
      acc[facility.districtId].push(facility.id);
      return acc;
    }, {} as Record<number, number[]>);
    
    // Build conditions for fetching planning entries
    const planningConditions = [
      eq(schema.schemaFormDataEntries.entityType, 'planning'),
      eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id),
    ];
    
    // Apply quarter filter if provided
    if (quarterNum !== undefined) {
      planningConditions.push(
        sql`${schema.schemaFormDataEntries.metadata}->>'quarter' = ${quarterNum.toString()}`
      );
    }
    
    // Fetch all planning entries for accessible facilities
    let planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(...planningConditions),
      with: {
        project: true,
      },
    });
    
    // Filter by accessible facilities
    planningEntries = planningEntries.filter(entry => facilityIds.includes(entry.facilityId));
    
    // Apply project type filter if provided
    if (projectType !== undefined) {
      planningEntries = planningEntries.filter(entry => entry.project?.projectType === projectType);
    }
    
    // For each district, count planning entries by status
    const districtApprovals = await Promise.all(
      provinceDistricts.map(async (district) => {
        const districtFacilityIds = facilitiesByDistrict[district.id] || [];
        
        // Filter planning entries for this district
        const districtPlanningEntries = planningEntries.filter(entry => 
          districtFacilityIds.includes(entry.facilityId)
        );
        
        // Count by approval status
        const approvedCount = districtPlanningEntries.filter(
          entry => entry.approvalStatus === 'APPROVED'
        ).length;
        
        const rejectedCount = districtPlanningEntries.filter(
          entry => entry.approvalStatus === 'REJECTED'
        ).length;
        
        const pendingCount = districtPlanningEntries.filter(
          entry => entry.approvalStatus === 'PENDING' || !entry.approvalStatus
        ).length;
        
        const totalCount = districtPlanningEntries.length;
        
        // Calculate approval rate (approvedCount ÷ totalCount × 100)
        const approvalRate = totalCount > 0 
          ? Math.round((approvedCount / totalCount) * 100 * 100) / 100 
          : 0;
        
        // Sum allocated budgets
        const allocatedBudget = districtPlanningEntries.reduce((sum, entry) => {
          const budget = calculateBudgetFromFormData(entry.formData, 'planning');
          return sum + budget;
        }, 0);
        
        return {
          districtId: district.id,
          districtName: district.name,
          allocatedBudget,
          approvedCount,
          rejectedCount,
          pendingCount,
          totalCount,
          approvalRate,
        };
      })
    );
    
    // Sort by district name
    const sortedDistricts = districtApprovals.sort((a, b) => 
      a.districtName.localeCompare(b.districtName)
    );
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=provinceApprovals instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      districts: sortedDistricts,
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('Get province approval summary error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve province approval summary' });
  }
};

// Get District Approval Details
export const getDistrictApprovalDetails: AppRouteHandler<GetDistrictApprovalDetailsRoute> = async (c) => {
  try {
    // Validate user session
    const userContext = await getUserContext(c);
    
    // Get query parameters
    const { districtId, facilityId, projectType, quarter } = c.req.query();
    
    console.log('[getDistrictApprovalDetails] Query params:', { districtId, facilityId, projectType, quarter });
    
    // Validate required parameters - either districtId or facilityId must be provided
    if (!districtId && !facilityId) {
      throw new HTTPException(400, { message: 'Either districtId or facilityId parameter is required' });
    }
    
    // Get current active reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      return c.json({
        facilities: [],
      }, HttpStatusCodes.OK);
    }
    
    // Get accessible facilities based on scope
    let facilityIds: number[];
    
    if (facilityId) {
      // Facility-level scope: get facility and its children
      const facilityIdNum = parseInt(facilityId);
      console.log('[getDistrictApprovalDetails] Using facility scope:', facilityIdNum);
      facilityIds = await getAccessibleFacilitiesForFacility(userContext, facilityIdNum);
      console.log('[getDistrictApprovalDetails] Accessible facility IDs:', facilityIds);
      
      // Validate user has access to at least one facility
      if (facilityIds.length === 0) {
        throw new HTTPException(403, { message: 'Access denied: You do not have access to this facility' });
      }
    } else {
      // District-level scope: get all facilities in district
      const districtIdNum = parseInt(districtId!);
      console.log('[getDistrictApprovalDetails] Using district scope:', districtIdNum);
      
      // Validate user has access to this district
      await validateDistrictAccess(userContext, districtIdNum);
      
      facilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtIdNum);
      console.log('[getDistrictApprovalDetails] Accessible facility IDs:', facilityIds);
    }
    
    // If no accessible facilities, return empty
    if (facilityIds.length === 0) {
      console.log('[getDistrictApprovalDetails] No accessible facilities, returning empty');
      return c.json({
        facilities: [],
      }, HttpStatusCodes.OK);
    }
    
    // Apply project type and quarter filters
    const quarterNum = quarter ? parseInt(quarter) : undefined;
    
    // Validate quarter is between 1-4
    if (quarterNum !== undefined && (quarterNum < 1 || quarterNum > 4)) {
      throw new HTTPException(400, { message: 'Quarter must be between 1 and 4' });
    }
    
    // Fetch accessible facilities
    console.log('[getDistrictApprovalDetails] Fetching facilities:', facilityIds);
    const accessibleFacilities = await db.query.facilities.findMany({
      where: and(
        inArray(schema.facilities.id, facilityIds),
        eq(schema.facilities.status, 'ACTIVE')
      ),
    });
    console.log('[getDistrictApprovalDetails] Found facilities:', accessibleFacilities.length);
    
    // Build conditions for fetching planning entries
    const planningConditions = [
      eq(schema.schemaFormDataEntries.entityType, 'planning'),
      eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id),
    ];
    
    // Apply quarter filter if provided
    if (quarterNum !== undefined) {
      planningConditions.push(
        sql`${schema.schemaFormDataEntries.metadata}->>'quarter' = ${quarterNum.toString()}`
      );
    }
    
    // Fetch planning entries with project details
    let planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(...planningConditions),
      with: {
        project: true,
      },
    });
    
    // Filter by accessible facilities
    planningEntries = planningEntries.filter(entry => facilityIds.includes(entry.facilityId));
    
    // Apply project type filter if provided
    if (projectType !== undefined) {
      planningEntries = planningEntries.filter(entry => entry.project?.projectType === projectType);
    }
    
    // Build facility approval details
    const facilityApprovals = planningEntries.map(entry => {
      const facility = accessibleFacilities.find(f => f.id === entry.facilityId);
      const project = entry.project;
      
      // Extract approval metadata from JSONB
      const metadata = entry.metadata as any || {};
      const approvedBy = metadata.approvedBy || null;
      const approvedAt = metadata.approvedAt || null;
      const entryQuarter = metadata.quarter || null;
      
      // Calculate allocated budget
      const allocatedBudget = calculateBudgetFromFormData(entry.formData, 'planning');
      
      // Determine approval status
      const approvalStatus = entry.approvalStatus || 'PENDING';
      
      return {
        facilityId: entry.facilityId,
        facilityName: facility?.name || `Facility ${entry.facilityId}`,
        projectId: entry.projectId,
        projectName: project?.name || `Project ${entry.projectId}`,
        projectCode: project?.code || '',
        allocatedBudget,
        approvalStatus: approvalStatus as 'APPROVED' | 'PENDING' | 'REJECTED',
        approvedBy,
        approvedAt,
        quarter: entryQuarter,
      };
    });
    
    // Sort by facility name, then project name
    const sortedApprovals = facilityApprovals.sort((a, b) => {
      const facilityCompare = a.facilityName.localeCompare(b.facilityName);
      if (facilityCompare !== 0) return facilityCompare;
      return a.projectName.localeCompare(b.projectName);
    });
    
    // Add deprecation warning header
    c.header('X-Deprecated', 'true');
    c.header('X-Deprecation-Message', 'This endpoint is deprecated. Please use /api/dashboard with components=districtApprovals instead.');
    c.header('X-Deprecation-Date', '2025-01-26');
    
    // Return JSON response
    return c.json({
      facilities: sortedApprovals,
    }, HttpStatusCodes.OK);
    
  } catch (error: any) {
    console.error('[getDistrictApprovalDetails] Error:', error);
    console.error('[getDistrictApprovalDetails] Error stack:', error?.stack);
    console.error('[getDistrictApprovalDetails] Error message:', error?.message);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Handle access control errors
    if (error.message?.includes('Access denied')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    throw new HTTPException(500, { message: `Failed to retrieve district approval details: ${error?.message || 'Unknown error'}` });
  }
};
