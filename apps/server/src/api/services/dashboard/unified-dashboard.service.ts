/**
 * Unified Dashboard Service
 * 
 * Orchestrates parallel component execution with error isolation for the unified dashboard API.
 * Provides a single entry point for fetching multiple dashboard components with unified filters.
 */

import type { UserContext } from '@/lib/utils/get-user-facility';
import { getCurrentReportingPeriod } from './aggregation.service';

export interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility';
  scopeId?: number;
  /** Project type filter - valid values: "HIV", "Malaria", "TB" */
  projectType?: string;
  periodId?: number;
  quarter?: number;
  facilityIds?: number[];
}

export interface ComponentResult {
  error?: boolean;
  message?: string;
  data?: any;
}

export class DashboardService {
  // Cache reporting period within request scope
  private reportingPeriodCache: Map<number | string, any> = new Map();
  
  /**
   * Main entry point for unified dashboard data fetching
   * Executes all component queries in parallel with error isolation
   * 
   * @param filters - Dashboard filters (scope, projectType, period, quarter)
   * @param components - Array of component names to fetch
   * @param userContext - User context with access control information
   * @returns Record of component results (data or error)
   */
  async getDashboardData(
    filters: DashboardFilters,
    components: string[],
    userContext: UserContext
  ): Promise<Record<string, ComponentResult>> {
    // Apply role-based scope restrictions
    const { applyRoleBasedScope } = await import('./role-scope.service');
    const scopedFilters = await applyRoleBasedScope(filters, userContext);
    
    // Get or validate reporting period
    const reportingPeriod = await this.getReportingPeriod(scopedFilters.periodId);
    
    if (!reportingPeriod) {
      throw new Error('No active reporting period found');
    }
    
    // Add reporting period to filters
    const enrichedFilters = {
      ...scopedFilters,
      periodId: reportingPeriod.id,
    };
    
    // Execute all component queries in parallel with error isolation
    const results: Record<string, ComponentResult> = {};
    
    const promises = components.map(async (component) => {
      try {
        const data = await this.fetchComponent(component, enrichedFilters, userContext);
        results[component] = { data };
      } catch (error) {
        results[component] = {
          error: true,
          message: (error as Error).message,
        };
      }
    });
    
    await Promise.all(promises);
    
    return results;
  }
  
  /**
   * Route component requests to appropriate handlers
   * 
   * @param component - Component name
   * @param filters - Dashboard filters
   * @param userContext - User context
   * @returns Component data
   * @throws Error if component is unknown
   */
  private async fetchComponent(
    component: string,
    filters: DashboardFilters,
    userContext: UserContext
  ): Promise<any> {
    switch (component) {
      case 'metrics':
        return this.getMetrics(filters, userContext);
      case 'programDistribution':
        return this.getProgramDistribution(filters, userContext);
      case 'budgetByDistrict':
        return this.getBudgetByDistrict(filters, userContext);
      case 'budgetByFacility':
        return this.getBudgetByFacility(filters, userContext);
      case 'provinceApprovals':
        return this.getProvinceApprovals(filters, userContext);
      case 'districtApprovals':
        return this.getDistrictApprovals(filters, userContext);
      case 'tasks':
        return this.getTasks(filters, userContext);
      default:
        throw new Error(`Unknown component: ${component}`);
    }
  }
  
  // Component handler methods
  
  /**
   * Get metrics component data
   * Reuses aggregateBudgetData service
   */
  private async getMetrics(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { aggregateBudgetData } = await import('./aggregation.service');
    const { resolveScopeToFacilityIds } = await import('./access-control.service');
    
    // Resolve scope to facility IDs if not already provided
    const facilityIds = filters.facilityIds || 
      await resolveScopeToFacilityIds(filters.scope, filters.scopeId, userContext);
    
    console.log(`[Metrics] Scope: ${filters.scope}, ScopeId: ${filters.scopeId}, FacilityIds:`, facilityIds);
    
    const metrics = await aggregateBudgetData({
      facilityIds,
      reportingPeriodId: filters.periodId!,
      projectType: filters.projectType,
      quarter: filters.quarter,
    });
    
    console.log(`[Metrics] Results:`, metrics);
    
    return {
      totalAllocated: metrics.allocated,
      totalSpent: metrics.spent,
      remaining: metrics.remaining,
      utilizationPercentage: metrics.utilizationPercentage,
    };
  }
  
  /**
   * Get program distribution component data
   * Reuses aggregateByProgram service
   */
  private async getProgramDistribution(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { aggregateByProgram } = await import('./aggregation.service');
    const { resolveScopeToFacilityIds } = await import('./access-control.service');
    
    // Resolve scope to facility IDs if not already provided
    const facilityIds = filters.facilityIds || 
      await resolveScopeToFacilityIds(filters.scope, filters.scopeId, userContext);
    
    const programs = await aggregateByProgram(
      facilityIds,
      filters.periodId!,
      filters.quarter
    );
    
    return {
      programs,
      total: programs.reduce((sum, p) => sum + p.allocated, 0),
    };
  }
  
  /**
   * Get budget by district component data
   * Reuses aggregateByDistrict service
   */
  private async getBudgetByDistrict(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { aggregateByDistrict } = await import('./aggregation.service');
    const { getAccessibleFacilitiesInProvince } = await import('./access-control.service');
    
    if (!filters.scopeId || filters.scope !== 'province') {
      return { districts: [] };
    }
    
    const facilityIds = await getAccessibleFacilitiesInProvince(
      userContext,
      filters.scopeId
    );
    
    const districts = await aggregateByDistrict(
      filters.scopeId,
      facilityIds,
      filters.periodId!,
      filters.projectType,
      filters.quarter
    );
    
    return { districts };
  }
  
  /**
   * Get budget by facility component data
   * Reuses aggregateByFacility service
   */
  private async getBudgetByFacility(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { aggregateByFacility } = await import('./aggregation.service');
    const { getAccessibleFacilitiesInDistrict } = await import('./access-control.service');
    
    if (!filters.scopeId || filters.scope !== 'district') {
      return { facilities: [] };
    }
    
    const facilityIds = await getAccessibleFacilitiesInDistrict(
      userContext,
      filters.scopeId
    );
    
    const facilities = await aggregateByFacility(
      filters.scopeId,
      facilityIds,
      filters.periodId!,
      filters.projectType,
      filters.quarter
    );
    
    return { facilities };
  }
  
  /**
   * Get province approvals component data
   * Aggregates approval status by district within a province
   */
  private async getProvinceApprovals(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { db } = await import('@/db');
    const { schemaFormDataEntries, districts } = await import('@/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    const { getAccessibleFacilitiesInProvince } = await import('./access-control.service');
    
    if (!filters.scopeId || filters.scope !== 'province') {
      return { districts: [] };
    }
    
    const provinceId = filters.scopeId;
    
    // Get accessible facilities in the province
    const facilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceId);
    
    if (facilityIds.length === 0) {
      return { districts: [] };
    }
    
    // Get all districts in the province
    const provinceDistricts = await db.query.districts.findMany({
      where: eq(districts.provinceId, provinceId),
    });
    
    // Get all facilities with their district information
    const allFacilities = await db.query.facilities.findMany({
      with: { district: true },
    });
    
    // Filter to facilities in our districts and accessible to user
    const accessibleDistrictFacilities = allFacilities.filter(
      f => f.district?.provinceId === provinceId && facilityIds.includes(f.id)
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
      eq(schemaFormDataEntries.entityType, 'planning'),
      eq(schemaFormDataEntries.reportingPeriodId, filters.periodId!),
    ];
    
    // Apply quarter filter if provided
    if (filters.quarter !== undefined) {
      planningConditions.push(
        sql`${schemaFormDataEntries.metadata}->>'quarter' = ${filters.quarter.toString()}`
      );
    }
    
    // Fetch all planning entries
    let planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(...planningConditions),
      with: { project: true },
    });
    
    // Filter by accessible facilities
    planningEntries = planningEntries.filter(entry => facilityIds.includes(entry.facilityId));
    
    // Apply projectType filter if provided
    if (filters.projectType !== undefined) {
      planningEntries = planningEntries.filter(entry => entry.project?.projectType === filters.projectType);
    }
    
    // Helper to calculate budget from form data
    const calculateBudget = (formData: any): number => {
      let total = 0;
      if (formData.activities && typeof formData.activities === 'object') {
        Object.values(formData.activities).forEach((activity: any) => {
          if (activity && typeof activity === 'object' && activity.total_budget) {
            total += activity.total_budget;
          }
        });
      }
      return total;
    };
    
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
        
        // Calculate approval rate
        const approvalRate = totalCount > 0 
          ? Math.round((approvedCount / totalCount) * 100 * 100) / 100 
          : 0;
        
        // Sum allocated budgets
        const allocatedBudget = districtPlanningEntries.reduce((sum, entry) => {
          return sum + calculateBudget(entry.formData);
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
    
    return { districts: districtApprovals };
  }
  
  /**
   * Get district approvals component data
   * Returns facility-level approval details within a district
   */
  private async getDistrictApprovals(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { db } = await import('@/db');
    const { schemaFormDataEntries, facilities: facilitiesSchema } = await import('@/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    const { getAccessibleFacilitiesInDistrict } = await import('./access-control.service');
    
    if (!filters.scopeId || filters.scope !== 'district') {
      return { facilities: [] };
    }
    
    const districtId = filters.scopeId;
    
    // Get accessible facilities in the district
    const facilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtId);
    
    if (facilityIds.length === 0) {
      return { facilities: [] };
    }
    
    // Fetch facilities in district
    const districtFacilities = await db.query.facilities.findMany({
      where: eq(facilitiesSchema.districtId, districtId),
    });
    
    // Filter to only accessible facilities
    const accessibleFacilities = districtFacilities.filter(f => facilityIds.includes(f.id));
    
    // Build conditions for fetching planning entries
    const planningConditions = [
      eq(schemaFormDataEntries.entityType, 'planning'),
      eq(schemaFormDataEntries.reportingPeriodId, filters.periodId!),
    ];
    
    // Apply quarter filter if provided
    if (filters.quarter !== undefined) {
      planningConditions.push(
        sql`${schemaFormDataEntries.metadata}->>'quarter' = ${filters.quarter.toString()}`
      );
    }
    
    // Fetch planning entries with project details
    let planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(...planningConditions),
      with: { project: true },
    });
    
    // Filter by accessible facilities
    planningEntries = planningEntries.filter(entry => facilityIds.includes(entry.facilityId));
    
    // Apply projectType filter if provided
    if (filters.projectType !== undefined) {
      planningEntries = planningEntries.filter(entry => entry.project?.projectType === filters.projectType);
    }
    
    // Helper to calculate budget from form data
    const calculateBudget = (formData: any): number => {
      let total = 0;
      if (formData.activities && typeof formData.activities === 'object') {
        Object.values(formData.activities).forEach((activity: any) => {
          if (activity && typeof activity === 'object' && activity.total_budget) {
            total += activity.total_budget;
          }
        });
      }
      return total;
    };
    
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
      const allocatedBudget = calculateBudget(entry.formData);
      
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
    
    return { facilities: facilityApprovals };
  }
  
  /**
   * Get tasks component data
   * Returns pending plans, pending executions, and upcoming deadlines
   */
  private async getTasks(filters: DashboardFilters, userContext: UserContext): Promise<any> {
    const { db } = await import('@/db');
    const { schemaFormDataEntries, projects } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const facilityIds = filters.facilityIds || userContext.accessibleFacilityIds;
    
    // Get all active projects for accessible facilities
    const activeProjects = await db.query.projects.findMany({
      where: and(
        eq(projects.reportingPeriodId, filters.periodId!),
        eq(projects.status, 'ACTIVE')
      ),
    });
    
    // Filter by accessible facilities
    const accessibleProjects = activeProjects.filter(
      p => p.facilityId && facilityIds.includes(p.facilityId)
    );
    
    // Get existing planning entries
    const existingPlans = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.entityType, 'planning'),
        eq(schemaFormDataEntries.reportingPeriodId, filters.periodId!)
      ),
    });
    
    const accessiblePlans = existingPlans.filter(p => facilityIds.includes(p.facilityId));
    
    // Get existing execution entries
    const existingExecutions = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.entityType, 'execution'),
        eq(schemaFormDataEntries.reportingPeriodId, filters.periodId!)
      ),
    });
    
    const accessibleExecutions = existingExecutions.filter(e => facilityIds.includes(e.facilityId));
    
    // Get reporting period for deadline calculation
    const reportingPeriod = await this.getReportingPeriod(filters.periodId);
    
    // Determine pending plans (projects without planning entries)
    const projectsWithPlans = new Set(accessiblePlans.map(p => p.projectId));
    const pendingPlans = accessibleProjects
      .filter(project => !projectsWithPlans.has(project.id))
      .map(project => ({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        reportingPeriodId: filters.periodId!,
        reportingPeriodYear: reportingPeriod?.year || 0,
        deadline: reportingPeriod ? new Date(reportingPeriod.endDate).toISOString() : '',
        status: 'PENDING',
      }));
    
    // Determine pending executions (projects with plans but missing execution for quarters)
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
        const completedQuarters = executions.map(e => (e.metadata as any)?.quarter).filter(Boolean);
        const nextQuarter = [1, 2, 3, 4].find(q => !completedQuarters.includes(q)) || 1;
        
        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code,
          reportingPeriodId: filters.periodId!,
          reportingPeriodYear: reportingPeriod?.year || 0,
          quarter: nextQuarter,
          deadline: reportingPeriod ? new Date(reportingPeriod.endDate).toISOString() : '',
          status: 'PENDING',
        };
      });
    
    // Calculate upcoming deadlines
    const upcomingDeadlines = reportingPeriod ? [{
      reportingPeriodId: reportingPeriod.id,
      year: reportingPeriod.year,
      periodType: reportingPeriod.periodType || 'ANNUAL',
      endDate: new Date(reportingPeriod.endDate).toISOString(),
      daysRemaining: Math.max(0, Math.ceil(
        (new Date(reportingPeriod.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )),
    }] : [];
    
    return {
      pendingPlans,
      pendingExecutions,
      correctionsRequired: [], // Placeholder for future implementation
      upcomingDeadlines,
    };
  }
  
  /**
   * Get reporting period by ID or fetch current active period
   * Implements caching within request scope to avoid redundant queries
   * Handles missing reporting period gracefully
   * 
   * @param periodId - Optional reporting period ID
   * @returns Reporting period or null if not found
   */
  private async getReportingPeriod(periodId?: number) {
    // Check cache first
    const cacheKey = periodId || 'active';
    if (this.reportingPeriodCache.has(cacheKey)) {
      return this.reportingPeriodCache.get(cacheKey);
    }
    
    let reportingPeriod;
    
    if (periodId) {
      // Fetch specific period by ID
      const { db } = await import('@/db');
      const { reportingPeriods } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      
      reportingPeriod = await db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.id, periodId),
      });
      
      // Handle missing specific period gracefully
      if (!reportingPeriod) {
        console.warn(`Reporting period with ID ${periodId} not found`);
        return null;
      }
    } else {
      // Get current active period
      reportingPeriod = await getCurrentReportingPeriod();
      
      // Handle missing active period gracefully
      if (!reportingPeriod) {
        console.warn('No active reporting period found');
        return null;
      }
    }
    
    // Cache the result for this request
    this.reportingPeriodCache.set(cacheKey, reportingPeriod);
    
    return reportingPeriod;
  }
}
