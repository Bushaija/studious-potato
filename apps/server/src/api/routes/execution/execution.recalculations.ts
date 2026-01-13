/**
 * Post-upsert recalculation logic for execution data
 * Ensures cumulative balances, rollups, and metadata stay in sync
 */

import { parseCode, calculateCumulativeBalance } from './execution.helpers';

interface ActivityData {
  code: string;
  name?: string;
  label?: string;
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
  cumulative_balance?: number;
  section?: string;
  subSection?: string;
  // VAT-specific fields (for VAT-applicable expenses)
  netAmount?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
  };
  vatAmount?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
  };
}

interface RecalculationResult {
  activities: Record<string, ActivityData>;
  rollups: {
    bySection: Record<string, QuarterlyTotal>;
    bySubSection: Record<string, QuarterlyTotal>;
  };
  metadata: {
    lastQuarterReported: string;
    lastReportedAt: string;
  };
}

interface QuarterlyTotal {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

/**
 * Determines the last quarter that has data (including explicit zeros)
 * Checks quarters in order: Q4 → Q3 → Q2 → Q1
 */
function detectLastQuarterReported(activities: Record<string, ActivityData>): string {
  const quarterOrder = ['q4', 'q3', 'q2', 'q1'] as const;
  
  for (const quarter of quarterOrder) {
    // Check if ANY activity has data for this quarter (including explicit 0)
    const hasData = Object.values(activities).some(activity => {
      const value = activity[quarter];
      return value !== undefined && value !== null;
    });
    
    if (hasData) {
      return quarter.toUpperCase(); // Return Q4, Q3, Q2, or Q1
    }
  }
  
  return 'Q1'; // Default if no data found
}

/**
 * Determines the highest quarter that has been reported (not just filled with zeros)
 * Uses heuristic: if any activity in that quarter has non-zero value, it's reported
 */
function detectLastReportedQuarter(activities: Record<string, ActivityData>): 'q1' | 'q2' | 'q3' | 'q4' {
  const quarters: Array<'q4' | 'q3' | 'q2' | 'q1'> = ['q4', 'q3', 'q2', 'q1'];
  
  for (const quarter of quarters) {
    // Check if ANY activity has non-zero value in this quarter
    const hasNonZeroData = Object.values(activities).some(activity => {
      const value = activity[quarter];
      return value !== undefined && value !== null && value !== 0;
    });
    
    if (hasNonZeroData) {
      return quarter;
    }
  }
  
  // Default to Q1 if all zeros (at least Q1 should be reported)
  return 'q1';
}

/**
 * Recalculates cumulative balances for all activities based on section type
 * 
 * Flow sections (A, B, C, G): Sum all quarters (income statement items)
 * Stock sections (D, E, F): Use last reported quarter value (balance sheet items)
 * 
 * Note: F = D - E (Net Financial Assets), so F inherits stock behavior
 * 
 * @param activities - Activities object with quarterly values
 * @param lastReportedQuarter - The last quarter that has been reported (q1, q2, q3, or q4)
 * @returns Activities with recalculated cumulative_balance values
 */
function recalculateCumulativeBalances(
  activities: Record<string, ActivityData>,
  lastReportedQuarter: 'q1' | 'q2' | 'q3' | 'q4'
): Record<string, ActivityData> {
  const enriched: Record<string, ActivityData> = {};
  
  for (const [code, activity] of Object.entries(activities)) {
    const { section, subSection } = parseCode(code);
    
    // Preserve undefined vs explicit zero distinction
    const q1 = activity.q1 !== undefined && activity.q1 !== null ? Number(activity.q1) : undefined;
    const q2 = activity.q2 !== undefined && activity.q2 !== null ? Number(activity.q2) : undefined;
    const q3 = activity.q3 !== undefined && activity.q3 !== null ? Number(activity.q3) : undefined;
    const q4 = activity.q4 !== undefined && activity.q4 !== null ? Number(activity.q4) : undefined;
    
    // CRITICAL FIX: Use calculateCumulativeBalance helper which has special handling for:
    // - Accumulated Surplus/Deficit (uses Q1 value, same for all quarters)
    // - Stock sections (D, E, F) - uses latest quarter value
    // - Flow sections (A, B, C) - sums all quarters
    // - Section G mixed logic (flow vs stock detection)
    const cumulativeBalance = calculateCumulativeBalance(
      q1,
      q2,
      q3,
      q4,
      section,
      subSection,
      code,
      activity.name || activity.label
    );
    
    console.log(`[recalculateCumulativeBalances] Activity ${code}:`, {
      section,
      subSection,
      name: activity.name || activity.label,
      q1, q2, q3, q4,
      cumulativeBalance
    });
    
    enriched[code] = {
      ...activity,
      section,
      subSection,
      cumulative_balance: cumulativeBalance
    };
  }
  
  return enriched;
}

/**
 * Checks if an activity is the "Surplus/Deficit of the Period" computed item
 * This item should be excluded from G section rollups because it's computed as A - B
 * and added separately in toBalances to avoid double-counting
 */
function isSurplusDeficitOfPeriod(activity: ActivityData): boolean {
  const name = (activity.name || activity.label || '').toLowerCase();
  // Match "Surplus/Deficit of the Period" but NOT "Accumulated Surplus/Deficit"
  return name.includes('surplus') && 
         name.includes('deficit') && 
         name.includes('period') && 
         !name.includes('accumulated');
}

/**
 * Recalculates rollups (bySection and bySubSection totals)
 * Uses the UPDATED cumulative_balance values from activities
 */
function recalculateRollups(activities: Record<string, ActivityData>): {
  bySection: Record<string, QuarterlyTotal>;
  bySubSection: Record<string, QuarterlyTotal>;
} {
  const bySection: Record<string, QuarterlyTotal> = {};
  const bySubSection: Record<string, QuarterlyTotal> = {};
  
  for (const [code, activity] of Object.entries(activities)) {
    const { section, subSection } = parseCode(code);
    
    // CRITICAL: Skip "Surplus/Deficit of the Period" from G section rollups
    // This item is computed as A - B and added separately in toBalances
    // Including it here would cause double-counting
    if (section === 'G' && isSurplusDeficitOfPeriod(activity)) {
      console.log(`[recalculateRollups] Skipping "Surplus/Deficit of the Period" from G rollup to avoid double-counting:`, code);
      continue;
    }
    
    // For VAT-applicable expenses, use netAmount instead of q1/q2/q3/q4
    // q1/q2/q3/q4 contain total invoice (net + VAT), but we want only net amount for expense totals
    const hasVATData = activity.netAmount && (
      activity.netAmount.q1 || activity.netAmount.q2 || 
      activity.netAmount.q3 || activity.netAmount.q4
    );
    
    const q1 = hasVATData && activity.netAmount ? Number(activity.netAmount.q1 || 0) : Number(activity.q1 || 0);
    const q2 = hasVATData && activity.netAmount ? Number(activity.netAmount.q2 || 0) : Number(activity.q2 || 0);
    const q3 = hasVATData && activity.netAmount ? Number(activity.netAmount.q3 || 0) : Number(activity.q3 || 0);
    const q4 = hasVATData && activity.netAmount ? Number(activity.netAmount.q4 || 0) : Number(activity.q4 || 0);
    
    // Use the recalculated cumulative_balance for total
    // This is critical - total should match cumulative_balance logic per section
    const cumulativeBalance = activity.cumulative_balance ?? (q1 + q2 + q3 + q4);
    
    // Aggregate by section
    if (section) {
      if (!bySection[section]) {
        bySection[section] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      }
      bySection[section].q1 += q1;
      bySection[section].q2 += q2;
      bySection[section].q3 += q3;
      bySection[section].q4 += q4;
      
      // For flow sections (A, B, G), total = sum of all quarters
      // For stock sections (D, E), total = latest quarter value
      // Since activities already have correct cumulative_balance, sum those
      bySection[section].total += cumulativeBalance;
    }
    
    // Aggregate by subsection (e.g., B-01, B-02)
    if (subSection) {
      if (!bySubSection[subSection]) {
        bySubSection[subSection] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      }
      bySubSection[subSection].q1 += q1;
      bySubSection[subSection].q2 += q2;
      bySubSection[subSection].q3 += q3;
      bySubSection[subSection].q4 += q4;
      bySubSection[subSection].total += cumulativeBalance;
    }
  }
  
  return { bySection, bySubSection };
}

/**
 * Master function: performs complete recalculation after upsert
 * Call this after merging new quarter data into formData.activities
 * 
 * Usage in update handler:
 * ```typescript
 * const merged = { ...existingFormData, ...updateFormData };
 * const recalculated = recalculateExecutionData(merged, context);
 * 
 * const updateData = {
 *   formData: {
 *     ...merged,
 *     activities: recalculated.activities,
 *     rollups: recalculated.rollups
 *   },
 *   metadata: {
 *     ...existingMetadata,
 *     ...recalculated.metadata
 *   }
 * };
 * ```
 */
export function recalculateExecutionData(
  formData: any,
  context: { projectType: string; facilityType: string; year?: number; quarter?: string }
): RecalculationResult {
  // Step 1: Normalize activities to keyed object format
  let activitiesObject: Record<string, ActivityData> = {};
  
  if (Array.isArray(formData?.activities)) {
    // Convert array to keyed object
    formData.activities.forEach((activity: any) => {
      if (activity?.code) {
        activitiesObject[activity.code] = activity;
      }
    });
  } else if (formData?.activities && typeof formData.activities === 'object') {
    // Already keyed object
    activitiesObject = formData.activities;
  }

  const lastReportedQuarter = detectLastReportedQuarter(activitiesObject);
  
  // Step 2: Recalculate cumulative balances for all activities
  const enrichedActivities = recalculateCumulativeBalances(activitiesObject, lastReportedQuarter);
  
  // Step 3: Recalculate rollups based on NEW cumulative balances
  const rollups = recalculateRollups(enrichedActivities);
  
  // Step 4: Detect last quarter reported
  const lastQuarterReported = detectLastQuarterReported(enrichedActivities);
  
  // Step 5: Build metadata
  const metadata = {
    lastQuarterReported,
    lastReportedAt: new Date().toISOString()
  };
  
  return {
    activities: enrichedActivities,
    rollups,
    metadata
  };
}

/**
 * Helper to merge new quarter data into existing activities
 * Preserves existing quarters, adds/updates new quarters
 */
export function mergeQuarterData(
  existingActivities: Record<string, ActivityData>,
  newQuarterData: Record<string, ActivityData>,
  quarter: 'q1' | 'q2' | 'q3' | 'q4'
): Record<string, ActivityData> {
  const merged: Record<string, ActivityData> = { ...existingActivities };
  
  for (const [code, newActivity] of Object.entries(newQuarterData)) {
    if (!merged[code]) {
      // New activity - initialize with all quarters as undefined except the new one
      merged[code] = {
        code,
        name: newActivity.name,
        label: newActivity.label,
        q1: undefined,
        q2: undefined,
        q3: undefined,
        q4: undefined,
        [quarter]: newActivity[quarter]
      };
    } else {
      // Existing activity - update only the new quarter
      merged[code] = {
        ...merged[code],
        [quarter]: newActivity[quarter]
      };
    }
  }
  
  return merged;
}

/**
 * Validation: Check if all required recalculations are present
 */
export function validateRecalculation(result: RecalculationResult): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check if activities have cumulative_balance
  const missingCumulative = Object.entries(result.activities)
    .filter(([code, activity]) => activity.cumulative_balance === undefined)
    .map(([code]) => code);
  
  if (missingCumulative.length > 0) {
    errors.push(`Missing cumulative_balance for activities: ${missingCumulative.join(', ')}`);
  }
  
  // Check if rollups exist
  if (!result.rollups.bySection || Object.keys(result.rollups.bySection).length === 0) {
    errors.push('Missing bySection rollups');
  }
  
  // Check if metadata is valid
  if (!result.metadata.lastQuarterReported) {
    errors.push('Missing lastQuarterReported in metadata');
  }
  
  const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  if (!validQuarters.includes(result.metadata.lastQuarterReported)) {
    errors.push(`Invalid lastQuarterReported: ${result.metadata.lastQuarterReported}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}