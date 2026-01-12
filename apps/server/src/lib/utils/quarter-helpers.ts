import { eq, and } from "drizzle-orm";
import type { Database } from "@/db";
import { schemaFormDataEntries } from "@/db/schema";

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
 */
export function buildQuarterSequence(currentQuarter: Quarter): QuarterSequence {
  const previous = getPreviousQuarter(currentQuarter);
  const next = getNextQuarter(currentQuarter);
  
  return {
    current: currentQuarter,
    previous,
    next,
    hasPrevious: previous !== null,
    hasNext: next !== null,
    isFirstQuarter: currentQuarter === "Q1",
  };
}

/**
 * Fetch previous quarter execution data
 * @param db - Database instance
 * @param projectId - Project ID
 * @param facilityId - Facility ID
 * @param reportingPeriodId - Reporting period ID
 * @param currentQuarter - Current quarter
 * @returns Previous execution record or null if not found
 * 
 * @example
 * const previousExecution = await fetchPreviousQuarterExecution(
 *   db,
 *   1,  // projectId
 *   5,  // facilityId
 *   2024, // reportingPeriodId
 *   "Q2"  // currentQuarter
 * );
 * // Returns Q1 execution record or null
 */
export async function fetchPreviousQuarterExecution(
  db: Database,
  projectId: number,
  facilityId: number,
  reportingPeriodId: number,
  currentQuarter: Quarter
): Promise<ExecutionRecord | null> {
  try {
    // Get the previous quarter
    const previousQuarter = getPreviousQuarter(currentQuarter);
    
    // If no previous quarter (Q1), return null
    if (!previousQuarter) {
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
    
    // Filter by quarter in the formData to find the previous quarter
    const previousExecution = results.find((record) => {
      const formData = record.formData as any;
      return formData?.context?.quarter === previousQuarter;
    });
    
    return previousExecution ? (previousExecution as ExecutionRecord) : null;
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
