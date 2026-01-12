import type { Quarter, ExecutionRecord } from "./quarter-helpers";

/**
 * Closing balances for Section D (Financial Assets), Section E (Financial Liabilities), and VAT Receivables
 */
export interface ClosingBalances {
  D: Record<string, number>; // Activity code -> closing balance
  E: Record<string, number>; // Activity code -> closing balance
  VAT: Record<string, number>; // VAT category -> net receivable balance
}

/**
 * Quarterly values structure for activities
 */
export interface QuarterlyValues {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  [key: string]: any; // Allow additional properties
}

/**
 * Computed totals for financial sections
 */
export interface BalanceTotals {
  financialAssets: number;      // Sum of all Section D balances
  financialLiabilities: number;  // Sum of all Section E balances
  netFinancialAssets: number;    // D - E
}

/**
 * Complete previous quarter balances structure
 */
export interface PreviousQuarterBalances {
  exists: boolean;
  quarter: Quarter | null;
  executionId: number | null;
  closingBalances: ClosingBalances | null;
  totals: BalanceTotals | null;
}

/**
 * Extract closing balances for Section D and E from execution data
 * 
 * Section D activities contain Financial Assets (cash at bank, petty cash, VAT receivables, other receivables)
 * Section E activities contain Financial Liabilities (payables, VAT receivables)
 * 
 * Activity codes follow the pattern: {PROJECT}_{ENTITY_TYPE}_{FACILITY_TYPE}_{SECTION}_{NUMBER}
 * Examples:
 *   - HIV_EXEC_HEALTH_CENTER_D_1 (Section D activity)
 *   - HIV_EXEC_HOSPITAL_E_1 (Section E activity)
 * 
 * @param executionData - Execution record with formData containing activities
 * @param quarter - Quarter to extract balances from (Q1, Q2, Q3, Q4)
 * @returns Closing balances object with Section D and E balances
 * 
 * @example
 * const balances = extractClosingBalances(execution, "Q1");
 * // Returns: { D: { "HIV_EXEC_HEALTH_CENTER_D_1": 5000 }, E: { "HIV_EXEC_HEALTH_CENTER_E_1": 2000 }, VAT: { "VAT Category": 1000 } }
 */
export function extractClosingBalances(
  executionData: ExecutionRecord,
  quarter: Quarter
): ClosingBalances {
  const closingBalances: ClosingBalances = { D: {}, E: {}, VAT: {} };
  
  try {
    // Access activities from formData
    const activities = executionData?.formData?.activities;
    
    console.log('🔍 [BalanceExtractor Debug] Extracting closing balances:', {
      quarter,
      executionId: executionData?.id,
      hasFormData: !!executionData?.formData,
      hasActivities: !!activities,
      activitiesType: typeof activities,
      activitiesIsArray: Array.isArray(activities),
      activitiesCount: activities ? (Array.isArray(activities) ? activities.length : Object.keys(activities).length) : 0,
      sampleKeys: activities ? (Array.isArray(activities) ? activities.slice(0, 3).map((a: any) => a.code) : Object.keys(activities).slice(0, 5)) : []
    });
    
    if (!activities || typeof activities !== "object") {
      console.warn("No activities found in execution data");
      return closingBalances;
    }
    
    // Extract Section D (Financial Assets) closing balances
    // Note: VAT receivables are now included in Section D with codes like _D_VAT_COMMUNICATION_ALL
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_D_")) {
        const quarterlyValues = activityData as QuarterlyValues;
        const quarterKey = quarter.toLowerCase();
        const closingBalance = (quarterlyValues as any)?.[quarterKey] || 0;
        
        if (closingBalance !== 0) {
          closingBalances.D[code] = closingBalance;
        }
      }
    });
    
    // Extract Section E (Financial Liabilities) closing balances
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_E_")) {
        const quarterlyValues = activityData as QuarterlyValues;
        const quarterKey = quarter.toLowerCase();
        const closingBalance = (quarterlyValues as any)?.[quarterKey] || 0;
        
        if (closingBalance !== 0) {
          closingBalances.E[code] = closingBalance;
        }
      }
    });

    // Extract VAT receivables closing balances
    // VAT receivables are stored in the execution data as net receivable amounts
    const vatReceivables = executionData?.formData?.vatReceivables;
    if (vatReceivables && typeof vatReceivables === "object") {
      Object.entries(vatReceivables).forEach(([category, data]) => {
        if (data && typeof data === "object") {
          const quarterlyData = data as Record<string, any>;
          const quarterKey = quarter.toLowerCase();
          const vatAmount = quarterlyData[quarterKey] || 0;
          const vatCleared = quarterlyData[`${quarterKey}_cleared`] || 0;
          const netReceivable = vatAmount - vatCleared;
          
          if (netReceivable > 0) {
            // Add to VAT section for reference
            closingBalances.VAT[category] = netReceivable;
            
            // Also add to Section D (Financial Assets) with a unique key
            const vatAssetKey = `VAT_${category.replace(/\s+/g, '_').toUpperCase()}`;
            closingBalances.D[vatAssetKey] = netReceivable;
          }
        }
      });
    }
    
    console.log(' [BalanceExtractor] Extracted closing balances:', {
      quarter,
      sectionDCount: Object.keys(closingBalances.D).length,
      sectionECount: Object.keys(closingBalances.E).length,
      vatCount: Object.keys(closingBalances.VAT).length,
      sectionDBalances: closingBalances.D,
      sectionEBalances: closingBalances.E,
      vatBalances: closingBalances.VAT,
    });
    
    return closingBalances;
  } catch (error) {
    console.error("Error extracting closing balances:", error);
    return { D: {}, E: {}, VAT: {} };
  }
}

/**
 * Calculate totals for Section D and E
 * 
 * Computes:
 * - financialAssets: Sum of all Section D balances
 * - financialLiabilities: Sum of all Section E balances
 * - netFinancialAssets: D - E (fundamental accounting relationship)
 * 
 * @param closingBalances - Closing balances object with Section D and E
 * @returns Totals object with computed sums
 * 
 * @example
 * const totals = calculateBalanceTotals({
 *   D: { "HIV_EXEC_HEALTH_CENTER_D_1": 5000, "HIV_EXEC_HEALTH_CENTER_D_2": 1000 },
 *   E: { "HIV_EXEC_HEALTH_CENTER_E_1": 2000 }
 * });
 * // Returns: { financialAssets: 6000, financialLiabilities: 2000, netFinancialAssets: 4000 }
 */
export function calculateBalanceTotals(
  closingBalances: ClosingBalances
): BalanceTotals {
  try {
    // Sum all Section D balances (Financial Assets)
    const financialAssets = Object.values(closingBalances.D || {}).reduce(
      (sum, value) => sum + (typeof value === "number" ? value : 0),
      0
    );
    
    // Sum all Section E balances (Financial Liabilities)
    const financialLiabilities = Object.values(closingBalances.E || {}).reduce(
      (sum, value) => sum + (typeof value === "number" ? value : 0),
      0
    );
    
    // Calculate net financial assets (D - E)
    const netFinancialAssets = financialAssets - financialLiabilities;
    
    return {
      financialAssets,
      financialLiabilities,
      netFinancialAssets,
    };
  } catch (error) {
    console.error("Error calculating balance totals:", error);
    // Return zeros on error
    return {
      financialAssets: 0,
      financialLiabilities: 0,
      netFinancialAssets: 0,
    };
  }
}

/**
 * Build the complete previousQuarterBalances object
 * 
 * This function constructs the full response structure for previous quarter balances,
 * handling both cases:
 * 1. Previous quarter exists: Extract balances and compute totals
 * 2. Previous quarter doesn't exist (Q1 or missing data): Return null structure
 * 
 * @param previousExecution - Previous quarter execution record (or null if not found)
 * @param previousQuarter - Previous quarter identifier (or null if Q1)
 * @returns Complete previousQuarterBalances object
 * 
 * @example
 * // Case 1: Previous quarter exists
 * const balances = buildPreviousQuarterBalances(q1Execution, "Q1");
 * // Returns: { exists: true, quarter: "Q1", executionId: 1, closingBalances: {...}, totals: {...} }
 * 
 * // Case 2: No previous quarter (Q1)
 * const balances = buildPreviousQuarterBalances(null, null);
 * // Returns: { exists: false, quarter: null, executionId: null, closingBalances: null, totals: null }
 */
export function buildPreviousQuarterBalances(
  previousExecution: ExecutionRecord | null,
  previousQuarter: Quarter | null
): PreviousQuarterBalances {
  try {
    // Case 1: No previous quarter (Q1 or not found)
    if (!previousExecution || !previousQuarter) {
      return {
        exists: false,
        quarter: null,
        executionId: null,
        closingBalances: null,
        totals: null,
      };
    }
    
    // Case 2: Previous quarter exists - extract balances
    const closingBalances = extractClosingBalances(
      previousExecution,
      previousQuarter
    );
    
    // Calculate totals from closing balances
    const totals = calculateBalanceTotals(closingBalances);
    
    return {
      exists: true,
      quarter: previousQuarter,
      executionId: previousExecution.id,
      closingBalances,
      totals,
    };
  } catch (error) {
    console.error("Error building previous quarter balances:", error);
    // Return null structure on error (fail gracefully)
    return {
      exists: false,
      quarter: null,
      executionId: null,
      closingBalances: null,
      totals: null,
    };
  }
}
