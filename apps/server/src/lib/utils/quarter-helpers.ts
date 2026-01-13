import { eq, and, desc } from "drizzle-orm";
import type { Database } from "@/db";
import { schemaFormDataEntries, reportingPeriods } from "@/db/schema";

/**
 * Quarter type definition
 */
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Quarter sequence metadata
 */
export interface QuarterSequence {
  current: Quarter;
  previous: Quarter | null;
  next: Quarter | null;
  hasPrevious: boolean;
  hasNext: boolean;
  isFirstQuarter: boolean;
  /** Indicates if the previous quarter is from a different fiscal year (Q4 → Q1 rollover) */
  isCrossFiscalYearRollover?: boolean;
}

/**
 * Execution record type (simplified for quarter helpers)
 */
export interface ExecutionRecord {
  id: number;
  schemaId: number;
  entityId: number | null;
  entityType: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number | null;
  formData: Record<string, any>;
  computedValues: Record<string, any> | null;
  validationState: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date;
}

/**
 * Get the previous quarter identifier
 * @param currentQuarter - Current quarter (Q1, Q2, Q3, Q4)
 * @returns Previous quarter or null if Q1
 * 
 * @example
 * getPreviousQuarter("Q1") // returns null
 * getPreviousQuarter("Q2") // returns "Q1"
 * getPreviousQuarter("Q3") // returns "Q2"
 * getPreviousQuarter("Q4") // returns "Q3"
 */
export function getPreviousQuarter(currentQuarter: Quarter): Quarter | null {
  const quarterMap: Record<Quarter, Quarter | null> = {
    Q1: null,
    Q2: "Q1",
    Q3: "Q2",
    Q4: "Q3",
  };
  
  return quarterMap[currentQuarter];
}

/**
 * Get the next quarter identifier
 * @param currentQuarter - Current quarter (Q1, Q2, Q3, Q4)
 * @returns Next quarter or null if Q4
 * 
 * @example
 * getNextQuarter("Q1") // returns "Q2"
 * getNextQuarter("Q2") // returns "Q3"
 * getNextQuarter("Q3") // returns "Q4"
 * getNextQuarter("Q4") // returns null
 */
export function getNextQuarter(currentQuarter: Quarter): Quarter | null {
  const quarterMap: Record<Quarter, Quarter | null> = {
    Q1: "Q2",
    Q2: "Q3",
    Q3: "Q4",
    Q4: null,
  };
  
  return quarterMap[currentQuarter];
}

/**
 * Build quarter sequence metadata
 * @param currentQuarter - Current quarter
 * @param hasCrossFiscalYearPrevious - Whether Q4 from previous fiscal year exists (for Q1)
 * @returns Quarter sequence object with navigation metadata
 * 
 * @example
 * buildQuarterSequence("Q2")
 * // returns {
 * //   current: "Q2",
 * //   previous: "Q1",
 * //   next: "Q3",
 * //   hasPrevious: true,
 * //   hasNext: true,
 * //   isFirstQuarter: false
 * // }
 * 
 * @example
 * // Q1 with cross-fiscal-year rollover
 * buildQuarterSequence("Q1", true)
 * // returns {
 * //   current: "Q1",
 * //   previous: "Q4",  // Q4 from previous fiscal year
 * //   next: "Q2",
 * //   hasPrevious: true,
 * //   hasNext: true,
 * //   isFirstQuarter: true
 * // }
 */
export function buildQuarterSequence(currentQuarter: Quarter, hasCrossFiscalYearPrevious: boolean = false): QuarterSequence {
  const previous = getPreviousQuarter(currentQuarter);
  const next = getNextQuarter(currentQuarter);
  
  // For Q1, if cross-fiscal-year previous exists, set previous to Q4
  const effectivePrevious = currentQuarter === "Q1" && hasCrossFiscalYearPrevious ? "Q4" : previous;
  
  return {
    current: currentQuarter,
    previous: effectivePrevious,
    next,
    hasPrevious: effectivePrevious !== null,
    hasNext: next !== null,
    isFirstQuarter: currentQuarter === "Q1",
    isCrossFiscalYearRollover: currentQuarter === "Q1" && hasCrossFiscalYearPrevious,
  };
}

/**
 * Fetch previous quarter execution data
 * 
 * Supports both intra-year rollover (Q2→Q1, Q3→Q2, Q4→Q3) and 
 * cross-fiscal-year rollover (Q1 of current year → Q4 of previous fiscal year).
 * 
 * @param db - Database instance
 * @param projectId - Project ID
 * @param facilityId - Facility ID
 * @param reportingPeriodId - Reporting period ID
 * @param currentQuarter - Current quarter
 * @returns Previous execution record or null if not found
 * 
 * @example
 * // Intra-year rollover (Q2 → Q1)
 * const previousExecution = await fetchPreviousQuarterExecution(
 *   db, 1, 5, 2025, "Q2"
 * );
 * // Returns Q1 execution record from same fiscal year
 * 
 * @example
 * // Cross-fiscal-year rollover (Q1 2025-26 → Q4 2024-25)
 * const previousExecution = await fetchPreviousQuarterExecution(
 *   db, 1, 5, 2026, "Q1"
 * );
 * // Returns Q4 execution record from previous fiscal year (2024-25)
 */
export async function fetchPreviousQuarterExecution(
  db: Database,
  projectId: number,
  facilityId: number,
  reportingPeriodId: number,
  currentQuarter: Quarter
): Promise<ExecutionRecord | null> {
  try {
    // Get the previous quarter within the same fiscal year
    const previousQuarter = getPreviousQuarter(currentQuarter);
    
    // Case 1: Intra-year rollover (Q2→Q1, Q3→Q2, Q4→Q3)
    if (previousQuarter) {
      const results = await db.query.schemaFormDataEntries.findMany({
        where: and(
          eq(schemaFormDataEntries.projectId, projectId),
          eq(schemaFormDataEntries.facilityId, facilityId),
          eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
          eq(schemaFormDataEntries.entityType, "execution")
        ),
      });
      
      const previousExecution = results.find((record) => {
        const formData = record.formData as any;
        return formData?.context?.quarter === previousQuarter;
      });
      
      if (previousExecution) {
        console.log(`[Quarter Rollover] Found ${previousQuarter} execution in same fiscal year`);
        return previousExecution as ExecutionRecord;
      }
      
      return null;
    }
    
    // Case 2: Cross-fiscal-year rollover (Q1 → Q4 of previous year)
    // This happens when currentQuarter is Q1
    console.log(`[Quarter Rollover] Q1 detected - looking for Q4 of previous fiscal year`);
    console.log(`[Quarter Rollover] Input params: projectId=${projectId}, facilityId=${facilityId}, reportingPeriodId=${reportingPeriodId}`);
    
    // Get the current reporting period to find its year
    const currentPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, reportingPeriodId),
    });
    
    if (!currentPeriod) {
      console.warn(`[Quarter Rollover] Current reporting period ${reportingPeriodId} not found`);
      return null;
    }
    
    const currentYear = currentPeriod.year;
    const previousYear = currentYear - 1;
    
    console.log(`[Quarter Rollover] Current period details:`, {
      id: currentPeriod.id,
      year: currentPeriod.year,
      periodType: currentPeriod.periodType,
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate
    });
    console.log(`[Quarter Rollover] Looking for previous fiscal year: ${previousYear}`);
    
    // Find the previous fiscal year's reporting period
    const previousYearPeriod = await db.query.reportingPeriods.findFirst({
      where: and(
        eq(reportingPeriods.year, previousYear),
        eq(reportingPeriods.periodType, currentPeriod.periodType || 'ANNUAL')
      ),
      orderBy: [desc(reportingPeriods.id)], // Get the most recent if multiple exist
    });
    
    if (!previousYearPeriod) {
      console.log(`[Quarter Rollover] No reporting period found for fiscal year ${previousYear} with periodType ${currentPeriod.periodType}`);
      
      // Try to find any reporting period for the previous year (without periodType filter)
      const anyPreviousYearPeriod = await db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.year, previousYear),
        orderBy: [desc(reportingPeriods.id)],
      });
      
      if (anyPreviousYearPeriod) {
        console.log(`[Quarter Rollover] Found a period for year ${previousYear} but with different periodType:`, {
          id: anyPreviousYearPeriod.id,
          year: anyPreviousYearPeriod.year,
          periodType: anyPreviousYearPeriod.periodType
        });
      } else {
        // List all available reporting periods for debugging
        const allPeriods = await db.query.reportingPeriods.findMany({
          orderBy: [desc(reportingPeriods.year)],
        });
        console.log(`[Quarter Rollover] All available reporting periods:`, allPeriods.map(p => ({
          id: p.id,
          year: p.year,
          periodType: p.periodType
        })));
      }
      
      return null;
    }
    
    console.log(`[Quarter Rollover] Found previous fiscal year period:`, {
      id: previousYearPeriod.id,
      year: previousYearPeriod.year,
      periodType: previousYearPeriod.periodType,
      startDate: previousYearPeriod.startDate,
      endDate: previousYearPeriod.endDate
    });
    
    // Query for Q4 execution from the previous fiscal year
    const previousYearResults = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, previousYearPeriod.id),
        eq(schemaFormDataEntries.entityType, "execution")
      ),
    });
    
    console.log(`[Quarter Rollover] Found ${previousYearResults.length} execution records for previous fiscal year`);
    
    // Log all quarters found in previous year
    const quartersFound = previousYearResults.map((record) => {
      const formData = record.formData as any;
      return {
        id: record.id,
        quarter: formData?.context?.quarter,
        hasActivities: !!formData?.activities
      };
    });
    console.log(`[Quarter Rollover] Quarters found in previous fiscal year:`, quartersFound);
    
    // Find Q4 execution from previous fiscal year
    const q4Execution = previousYearResults.find((record) => {
      const formData = record.formData as any;
      return formData?.context?.quarter === "Q4";
    });
    
    if (q4Execution) {
      console.log(`[Quarter Rollover] ✅ Found Q4 execution from fiscal year ${previousYear} (ID: ${q4Execution.id})`);
      return q4Execution as ExecutionRecord;
    }
    
    console.log(`[Quarter Rollover] No Q4 execution found for fiscal year ${previousYear}`);
    return null;
  } catch (error) {
    // Log error but don't throw - gracefully return null
    console.error("Error fetching previous quarter execution:", error);
    return null;
  }
}

/**
 * Fetch next quarter execution data
 * @param db - Database instance
 * @param projectId - Project ID
 * @param facilityId - Facility ID
 * @param reportingPeriodId - Reporting period ID
 * @param currentQuarter - Current quarter
 * @returns Next execution record or null if not found
 * 
 * @example
 * const nextExecution = await fetchNextQuarterExecution(
 *   db,
 *   1,  // projectId
 *   5,  // facilityId
 *   2024, // reportingPeriodId
 *   "Q1"  // currentQuarter
 * );
 * // Returns Q2 execution record or null
 */
export async function fetchNextQuarterExecution(
  db: Database,
  projectId: number,
  facilityId: number,
  reportingPeriodId: number,
  currentQuarter: Quarter
): Promise<ExecutionRecord | null> {
  try {
    // Get the next quarter
    const nextQuarter = getNextQuarter(currentQuarter);
    
    // If no next quarter (Q4), return null
    if (!nextQuarter) {
      return null;
    }
    
    // Query for all execution records matching the criteria
    const results = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, "execution")
      ),
    });
    
    // Filter by quarter in the formData to find the next quarter
    const nextExecution = results.find((record) => {
      const formData = record.formData as any;
      return formData?.context?.quarter === nextQuarter;
    });
    
    return nextExecution ? (nextExecution as ExecutionRecord) : null;
  } catch (error) {
    // Log error but don't throw - gracefully return null
    console.error("Error fetching next quarter execution:", error);
    return null;
  }
}

/**
 * Fetch all subsequent quarter executions (Q(n+1), Q(n+2), Q(n+3))
 * @param db - Database instance
 * @param projectId - Project ID
 * @param facilityId - Facility ID
 * @param reportingPeriodId - Reporting period ID
 * @param currentQuarter - Current quarter
 * @returns Array of subsequent execution records with their quarters
 * 
 * @example
 * const subsequentQuarters = await fetchSubsequentQuarterExecutions(
 *   db,
 *   1,  // projectId
 *   5,  // facilityId
 *   2024, // reportingPeriodId
 *   "Q1"  // currentQuarter
 * );
 * // Returns [{ quarter: "Q2", execution: {...} }, { quarter: "Q3", execution: {...} }, ...]
 */
export async function fetchSubsequentQuarterExecutions(
  db: Database,
  projectId: number,
  facilityId: number,
  reportingPeriodId: number,
  currentQuarter: Quarter
): Promise<Array<{ quarter: Quarter; execution: ExecutionRecord }>> {
  try {
    // Query for all execution records matching the criteria
    const results = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, "execution")
      ),
    });
    
    // Determine subsequent quarters
    const subsequentQuarters: Quarter[] = [];
    let nextQuarter = getNextQuarter(currentQuarter);
    
    while (nextQuarter) {
      subsequentQuarters.push(nextQuarter);
      nextQuarter = getNextQuarter(nextQuarter);
    }
    
    // Find executions for subsequent quarters
    const subsequentExecutions: Array<{ quarter: Quarter; execution: ExecutionRecord }> = [];
    
    for (const quarter of subsequentQuarters) {
      const execution = results.find((record) => {
        const formData = record.formData as any;
        return formData?.context?.quarter === quarter;
      });
      
      if (execution) {
        subsequentExecutions.push({
          quarter,
          execution: execution as ExecutionRecord,
        });
      }
    }
    
    return subsequentExecutions;
  } catch (error) {
    // Log error but don't throw - gracefully return empty array
    console.error("Error fetching subsequent quarter executions:", error);
    return [];
  }
}
