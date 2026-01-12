/**
 * Data Aggregation Service for Dashboard
 * 
 * Provides helper functions for aggregating budget data across different organizational levels
 * (province, district, facility) and by program.
 */

import { db } from '@/db';
import { 
  schemaFormDataEntries, 
  facilities, 
  districts,
  reportingPeriods 
} from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { calculateAllocatedBudget, calculateSpentBudget, calculateUtilization } from './budget-calculations.service';

interface AggregationFilters {
  facilityIds: number[];
  reportingPeriodId: number;
  /** Project type filter - valid values: "HIV", "Malaria", "TB" */
  projectType?: string;
  quarter?: number;
}

interface BudgetAggregation {
  allocated: number;
  spent: number;
  remaining: number;
  utilizationPercentage: number;
}

/**
 * Get current active reporting period
 * 
 * @returns Active reporting period or null if none exists
 */
export async function getCurrentReportingPeriod() {
  return await db.query.reportingPeriods.findFirst({
    where: eq(reportingPeriods.status, 'ACTIVE'),
    orderBy: (reportingPeriods, { desc }) => [desc(reportingPeriods.year)],
  });
}

/**
 * Fetch planning entries with filters
 * 
 * @param filters - Aggregation filters (facilityIds, reportingPeriodId, projectType, quarter)
 * @param filters.facilityIds - Array of facility IDs to filter by
 * @param filters.reportingPeriodId - Reporting period ID
 * @param filters.projectType - Optional project type filter ("HIV", "Malaria", "TB")
 * @param filters.quarter - Optional quarter filter
 * @returns Array of planning form data entries
 */
export async function fetchPlanningEntries(filters: AggregationFilters) {
  const conditions = [
    eq(schemaFormDataEntries.entityType, 'planning'),
    eq(schemaFormDataEntries.reportingPeriodId, filters.reportingPeriodId),
    inArray(schemaFormDataEntries.facilityId, filters.facilityIds),
    eq(schemaFormDataEntries.approvalStatus, 'APPROVED'),
  ];

  // Apply quarter filter if provided
  if (filters.quarter !== undefined) {
    conditions.push(
      sql`${schemaFormDataEntries.metadata}->>'quarter' = ${filters.quarter.toString()}`
    );
  }

  let entries = await db.query.schemaFormDataEntries.findMany({
    where: and(...conditions),
    with: {
      project: true,
    },
  });

  // Apply projectType filter if provided
  if (filters.projectType !== undefined) {
    entries = entries.filter(entry => entry.project?.projectType === filters.projectType);
  }

  return entries;
}

/**
 * Fetch execution entries with filters
 * 
 * @param filters - Aggregation filters (facilityIds, reportingPeriodId, projectType, quarter)
 * @param filters.facilityIds - Array of facility IDs to filter by
 * @param filters.reportingPeriodId - Reporting period ID
 * @param filters.projectType - Optional project type filter ("HIV", "Malaria", "TB")
 * @param filters.quarter - Optional quarter filter
 * @returns Array of execution form data entries
 */
export async function fetchExecutionEntries(filters: AggregationFilters) {
  const conditions = [
    eq(schemaFormDataEntries.entityType, 'execution'),
    eq(schemaFormDataEntries.reportingPeriodId, filters.reportingPeriodId),
    inArray(schemaFormDataEntries.facilityId, filters.facilityIds),
  ];

  // Apply quarter filter if provided
  if (filters.quarter !== undefined) {
    conditions.push(
      sql`${schemaFormDataEntries.metadata}->>'quarter' = ${filters.quarter.toString()}`
    );
  }

  let entries = await db.query.schemaFormDataEntries.findMany({
    where: and(...conditions),
    with: {
      project: true,
    },
  });

  // Apply projectType filter if provided
  if (filters.projectType !== undefined) {
    entries = entries.filter(entry => entry.project?.projectType === filters.projectType);
  }

  return entries;
}

/**
 * Aggregate budget data for a set of facilities
 * 
 * @param filters - Aggregation filters
 * @param filters.facilityIds - Array of facility IDs to filter by
 * @param filters.reportingPeriodId - Reporting period ID
 * @param filters.projectType - Optional project type filter ("HIV", "Malaria", "TB")
 * @param filters.quarter - Optional quarter filter
 * @returns Aggregated budget metrics
 */
export async function aggregateBudgetData(
  filters: AggregationFilters
): Promise<BudgetAggregation> {
  const planningEntries = await fetchPlanningEntries(filters);
  const executionEntries = await fetchExecutionEntries(filters);

  const allocated = calculateAllocatedBudget(planningEntries);
  const spent = calculateSpentBudget(executionEntries);
  const remaining = allocated - spent;
  const utilizationPercentage = calculateUtilization(allocated, spent);

  return {
    allocated,
    spent,
    remaining,
    utilizationPercentage,
  };
}

/**
 * Aggregate budget data by district within a province
 * 
 * @param provinceId - Province ID
 * @param facilityIds - Accessible facility IDs
 * @param reportingPeriodId - Reporting period ID
 * @param projectType - Optional project type filter ("HIV", "Malaria", "TB")
 * @param quarter - Optional quarter filter
 * @returns Array of district budget aggregations
 */
export async function aggregateByDistrict(
  provinceId: number,
  facilityIds: number[],
  reportingPeriodId: number,
  projectType?: string,
  quarter?: number
) {
  // Get all districts in the province
  const provinceDistricts = await db.query.districts.findMany({
    where: eq(districts.provinceId, provinceId),
  });

  // Get facilities in these districts
  const districtFacilities = await db.query.facilities.findMany({
    where: and(
      inArray(facilities.districtId, provinceDistricts.map(d => d.id)),
      inArray(facilities.id, facilityIds)
    ),
  });

  // Group facilities by district
  const facilitiesByDistrict = districtFacilities.reduce((acc, facility) => {
    if (!facility.districtId) return acc;
    if (!acc[facility.districtId]) {
      acc[facility.districtId] = [];
    }
    acc[facility.districtId].push(facility.id);
    return acc;
  }, {} as Record<number, number[]>);

  // Aggregate budget for each district
  const districtAggregations = await Promise.all(
    provinceDistricts.map(async (district) => {
      const districtFacilityIds = facilitiesByDistrict[district.id] || [];
      
      if (districtFacilityIds.length === 0) {
        return {
          districtId: district.id,
          districtName: district.name,
          allocated: 0,
          spent: 0,
          remaining: 0,
          utilizationPercentage: 0,
        };
      }

      const budgetData = await aggregateBudgetData({
        facilityIds: districtFacilityIds,
        reportingPeriodId,
        projectType,
        quarter,
      });

      return {
        districtId: district.id,
        districtName: district.name,
        ...budgetData,
      };
    })
  );

  // Sort by allocated budget descending
  return districtAggregations.sort((a, b) => b.allocated - a.allocated);
}

/**
 * Aggregate budget data by facility within a district
 * 
 * @param districtId - District ID
 * @param facilityIds - Accessible facility IDs
 * @param reportingPeriodId - Reporting period ID
 * @param projectType - Optional project type filter ("HIV", "Malaria", "TB")
 * @param quarter - Optional quarter filter
 * @returns Array of facility budget aggregations
 */
export async function aggregateByFacility(
  districtId: number,
  facilityIds: number[],
  reportingPeriodId: number,
  projectType?: string,
  quarter?: number
) {
  // Get facilities in the district
  const districtFacilities = await db.query.facilities.findMany({
    where: and(
      eq(facilities.districtId, districtId),
      inArray(facilities.id, facilityIds)
    ),
  });

  // Aggregate budget for each facility
  const facilityAggregations = await Promise.all(
    districtFacilities.map(async (facility) => {
      const budgetData = await aggregateBudgetData({
        facilityIds: [facility.id],
        reportingPeriodId,
        projectType,
        quarter,
      });

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        facilityType: facility.facilityType,
        ...budgetData,
      };
    })
  );

  // Sort by allocated budget descending
  return facilityAggregations.sort((a, b) => b.allocated - a.allocated);
}

/**
 * Aggregate budget data by program
 * 
 * @param facilityIds - Accessible facility IDs
 * @param reportingPeriodId - Reporting period ID
 * @param quarter - Optional quarter filter
 * @returns Array of program budget aggregations
 */
export async function aggregateByProgram(
  facilityIds: number[],
  reportingPeriodId: number,
  quarter?: number
) {
  // Fetch all planning entries for the facilities
  const planningEntries = await fetchPlanningEntries({
    facilityIds,
    reportingPeriodId,
    quarter,
  });

  // Group by program (project type)
  const entriesByProgram = planningEntries.reduce((acc, entry) => {
    const programId = entry.project?.projectType || 'unknown';
    if (!acc[programId]) {
      acc[programId] = [];
    }
    acc[programId].push(entry);
    return acc;
  }, {} as Record<string, typeof planningEntries>);

  // Calculate budget for each program
  const programAggregations = Object.entries(entriesByProgram).map(([programId, entries]) => {
    const allocated = calculateAllocatedBudget(entries);
    const programName = entries[0]?.project?.name || `Program ${programId}`;

    return {
      programId: parseInt(programId) || 0,
      programName,
      allocated,
    };
  });

  // Calculate total and percentages
  const total = programAggregations.reduce((sum, p) => sum + p.allocated, 0);
  
  const programsWithPercentage = programAggregations.map(program => ({
    ...program,
    percentage: total > 0 ? Math.round((program.allocated / total) * 100 * 100) / 100 : 0,
  }));

  // Sort by allocated budget descending
  return programsWithPercentage.sort((a, b) => b.allocated - a.allocated);
}
