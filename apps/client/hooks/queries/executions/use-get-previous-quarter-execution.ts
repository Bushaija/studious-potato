import { useQuery } from "@tanstack/react-query";
import { getExecutions } from "@/fetchers/execution/get-executions";
import type { PreviousQuarterBalances, QuarterSequence } from "@/features/execution/types/quarterly-rollover";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface UseGetPreviousQuarterExecutionParams {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  currentQuarter: Quarter;
  enabled?: boolean;
  /** Previous fiscal year's reporting period ID (for Q1 cross-fiscal-year rollover) */
  previousFiscalYearReportingPeriodId?: number;
}

/**
 * Get the previous quarter identifier within the same fiscal year
 */
function getPreviousQuarter(currentQuarter: Quarter): Quarter | null {
  const quarterMap: Record<Quarter, Quarter | null> = {
    Q1: null,
    Q2: "Q1",
    Q3: "Q2",
    Q4: "Q3",
  };
  return quarterMap[currentQuarter];
}

/**
 * Hook to fetch previous quarter execution data for balance rollover
 * 
 * This hook fetches the execution data from the previous quarter to enable
 * automatic balance rollover when creating Q2, Q3, or Q4 executions.
 * 
 * For Q1, it supports cross-fiscal-year rollover by fetching Q4 from the
 * previous fiscal year if previousFiscalYearReportingPeriodId is provided.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * @param params - Query parameters
 * @returns Query result with previous quarter execution data
 */
export function useGetPreviousQuarterExecution({
  projectId,
  facilityId,
  reportingPeriodId,
  currentQuarter,
  enabled = true,
  previousFiscalYearReportingPeriodId,
}: UseGetPreviousQuarterExecutionParams) {
  const previousQuarter = getPreviousQuarter(currentQuarter);
  
  // For Q1, we need to check for cross-fiscal-year rollover (Q4 from previous year)
  const isQ1CrossFiscalYear = currentQuarter === "Q1" && !!previousFiscalYearReportingPeriodId;
  
  // Determine which reporting period to query
  const targetReportingPeriodId = isQ1CrossFiscalYear 
    ? previousFiscalYearReportingPeriodId 
    : reportingPeriodId;
  
  // Determine which quarter to fetch
  const targetQuarter = isQ1CrossFiscalYear ? "Q4" : previousQuarter;
  
  // Only fetch if we have a target quarter and all required IDs
  // For Q1, we can fetch if we have the previous fiscal year's reporting period
  const shouldFetch = Boolean(
    enabled &&
    targetQuarter &&
    projectId &&
    facilityId &&
    targetReportingPeriodId
  );

  console.log('🔍 [useGetPreviousQuarterExecution] Config:', {
    currentQuarter,
    previousQuarter,
    isQ1CrossFiscalYear,
    targetQuarter,
    targetReportingPeriodId,
    reportingPeriodId,
    previousFiscalYearReportingPeriodId,
    shouldFetch
  });

  return useQuery({
    queryKey: [
      "execution",
      "previous-quarter",
      projectId,
      facilityId,
      targetReportingPeriodId,
      currentQuarter,
      targetQuarter,
    ],
    queryFn: async () => {
      if (!targetQuarter || !projectId || !facilityId || !targetReportingPeriodId) {
        console.log('📊 [useGetPreviousQuarterExecution] Missing required params, returning empty');
        return {
          previousQuarterBalances: {
            exists: false,
            quarter: null,
            executionId: null,
            closingBalances: null,
            totals: null,
          } as PreviousQuarterBalances,
          quarterSequence: {
            current: currentQuarter,
            previous: null,
            next: null,
            hasPrevious: false,
            hasNext: false,
            isFirstQuarter: true,
          } as QuarterSequence,
        };
      }

      console.log('📊 [useGetPreviousQuarterExecution] Fetching:', {
        projectId,
        facilityId,
        reportingPeriodId: targetReportingPeriodId,
        quarter: targetQuarter,
        isQ1CrossFiscalYear
      });

      // Fetch executions for the target quarter
      // IMPORTANT: API expects string parameters
      const response = await getExecutions({
        projectId: String(projectId),
        facilityId: String(facilityId),
        reportingPeriodId: String(targetReportingPeriodId),
        quarter: targetQuarter,
        limit: "1",
      });

      // Check if we found a previous quarter execution
      if (response.data && response.data.length > 0) {
        const previousExecution = response.data[0];
        
        console.log('📊 [useGetPreviousQuarterExecution] Found previous execution:', {
          id: previousExecution.id,
          quarter: previousExecution.formData?.context?.quarter,
          isQ1CrossFiscalYear
        });
        
        // Extract closing balances from the previous execution
        const previousQuarterBalances: PreviousQuarterBalances = {
          exists: true,
          quarter: targetQuarter,
          executionId: previousExecution.id,
          closingBalances: extractClosingBalances(previousExecution),
          totals: calculateTotals(previousExecution),
        };

        const quarterSequence: QuarterSequence = {
          current: currentQuarter,
          previous: targetQuarter,
          next: getNextQuarter(currentQuarter),
          hasPrevious: true,
          hasNext: getNextQuarter(currentQuarter) !== null,
          isFirstQuarter: currentQuarter === "Q1",
          isCrossFiscalYearRollover: isQ1CrossFiscalYear,
        };

        return {
          previousQuarterBalances,
          quarterSequence,
        };
      }

      // No previous quarter execution found
      console.log('📊 [useGetPreviousQuarterExecution] No previous quarter execution found');
      
      return {
        previousQuarterBalances: {
          exists: false,
          quarter: null,
          executionId: null,
          closingBalances: null,
          totals: null,
        } as PreviousQuarterBalances,
        quarterSequence: {
          current: currentQuarter,
          previous: targetQuarter,
          next: getNextQuarter(currentQuarter),
          hasPrevious: false,
          hasNext: getNextQuarter(currentQuarter) !== null,
          isFirstQuarter: currentQuarter === "Q1",
        } as QuarterSequence,
      };
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get the next quarter identifier
 */
function getNextQuarter(currentQuarter: Quarter): Quarter | null {
  const quarterMap: Record<Quarter, Quarter | null> = {
    Q1: "Q2",
    Q2: "Q3",
    Q3: "Q4",
    Q4: null,
  };
  return quarterMap[currentQuarter];
}

/**
 * Extract closing balances from execution data
 * Includes Section D (Financial Assets), Section E (Financial Liabilities), 
 * Section G (Closing Balance/Equity), and VAT Receivables
 */
function extractClosingBalances(execution: any): { 
  D: Record<string, number>; 
  E: Record<string, number>; 
  G: Record<string, number>;
  VAT: Record<string, number>;
  closingBalanceTotal?: number;
} {
  const closingBalances = { D: {}, E: {}, G: {}, VAT: {} } as { 
    D: Record<string, number>; 
    E: Record<string, number>; 
    G: Record<string, number>;
    VAT: Record<string, number>;
    closingBalanceTotal?: number;
  };

  // Extract from formData.activities - this is the primary source
  // Activities can be stored as an object keyed by code or as an array
  const rawActivities = execution.formData?.activities || {};
  const activities: Record<string, any> = Array.isArray(rawActivities)
    ? rawActivities.reduce((acc: Record<string, any>, act: any) => {
        if (act?.code) acc[act.code] = act;
        return acc;
      }, {})
    : rawActivities;
  
  // Also check computedValues for totals (G. Closing Balance is computed)
  const computedValues = execution.computedValues || {};

  // Get the quarter key - handle both uppercase and lowercase
  const quarterRaw = execution.formData?.context?.quarter || 'Q1';
  const quarter = quarterRaw.toLowerCase();

  console.log('[Rollover] Extracting closing balances:', {
    executionId: execution.id,
    quarter,
    quarterRaw,
    activitiesCount: Object.keys(activities).length,
    activitiesIsArray: Array.isArray(rawActivities),
    hasComputedValues: !!computedValues,
    computedValuesKeys: Object.keys(computedValues),
    sampleActivityKeys: Object.keys(activities).slice(0, 10),
    sectionGKeys: Object.keys(activities).filter(k => k.includes('_G_'))
  });

  // Extract Section D (Financial Assets) closing balances
  Object.entries(activities).forEach(([code, data]: [string, any]) => {
    if (code.includes('_D_')) {
      const value = Number(data[quarter]) || 0;
      if (value !== 0) {
        closingBalances.D[code] = value;
      }
    }
  });

  console.log('[Rollover] Section D balances:', JSON.parse(JSON.stringify(closingBalances.D)));

  // Extract Section E (Financial Liabilities) closing balances
  Object.entries(activities).forEach(([code, data]: [string, any]) => {
    if (code.includes('_E_')) {
      const value = Number(data[quarter]) || 0;
      if (value !== 0) {
        closingBalances.E[code] = value;
      }
    }
  });

  console.log('[Rollover] Section E balances:', JSON.parse(JSON.stringify(closingBalances.E)));

  // Extract Section G (Closing Balance / Equity) closing balances
  // This is critical for cross-fiscal-year rollover where G. Closing Balance becomes Accumulated Surplus
  let closingBalanceTotal = 0;
  
  const sectionGKeys = Object.keys(activities).filter(k => k.includes('_G_'));
  console.log('[Rollover] Extracting Section G:', {
    activitiesGKeys: sectionGKeys,
    computedValuesKeys: Object.keys(computedValues)
  });
  
  // Extract Section G activities - include ALL values (even 0) for Accumulated Surplus
  Object.entries(activities).forEach(([code, data]: [string, any]) => {
    if (code.includes('_G_')) {
      let value = Number(data[quarter]) || 0;
      
      // CRITICAL FIX: For Accumulated Surplus/Deficit (_G_1), use Q1 value if current quarter is 0
      // Accumulated Surplus/Deficit is the SAME across all quarters of the fiscal year
      // If the current quarter value is 0, fall back to Q1 value
      if (code.includes('_G_1') && !code.includes('G-01') && value === 0) {
        const q1Value = Number(data.q1) || 0;
        if (q1Value !== 0) {
          value = q1Value;
          console.log('[Rollover] Using Q1 value for Accumulated Surplus/Deficit:', {
            code,
            quarter,
            originalValue: 0,
            q1Value
          });
        }
      }
      
      // CRITICAL: Always store Section G values, even if 0
      // This ensures Accumulated Surplus/Deficit is available for rollover
      closingBalances.G[code] = value;
      
      console.log('[Rollover] Section G activity:', { 
        code, 
        quarterValue: value,
        rawData: data,
        isAccumulatedSurplus: code.includes('_G_1') && !code.includes('G-01'),
        isClosingBalanceTotal: code.includes('_G_5')
      });
      
      // Check if this is the G. Closing Balance total row (ends with _G_5)
      // Activity code pattern: {PROJECT}_EXEC_{FACILITY}_G_5
      if (code.includes('_G_5')) {
        closingBalanceTotal = value;
        console.log('[Rollover] Found G. Closing Balance total from activities:', value);
      }
    }
  });
  
  // If we didn't find the closing balance total in activities, try computedValues
  // The G. Closing Balance might be stored in computedValues as it's a computed total
  if (closingBalanceTotal === 0 && computedValues) {
    // Check for closingBalance or equity in computedValues
    const possibleKeys = ['closingBalance', 'equity', 'gTotal', 'G', 'netAssets'];
    for (const key of possibleKeys) {
      if (computedValues[key]) {
        const value = typeof computedValues[key] === 'object' 
          ? Number(computedValues[key][quarter]) || 0
          : Number(computedValues[key]) || 0;
        if (value !== 0) {
          closingBalanceTotal = value;
          console.log(`[Rollover] Found G. Closing Balance total from computedValues.${key}:`, value);
          break;
        }
      }
    }
  }
  
  // If still no closing balance total, calculate it from Section G components
  // G. Closing Balance = Accumulated Surplus/Deficit + Prior Year Adjustments + Surplus/Deficit of Period
  if (closingBalanceTotal === 0) {
    let accumulatedSurplus = 0;
    let priorYearAdjustments = 0;
    let surplusDeficitPeriod = 0;
    
    Object.entries(closingBalances.G).forEach(([code, value]) => {
      // Accumulated Surplus/Deficit is _G_1 (not in G-01 subcategory)
      if (code.includes('_G_1') && !code.includes('G-01')) {
        accumulatedSurplus = value;
      }
      // Prior Year Adjustments are in G-01 subcategory (_G_G-01_1, _G_G-01_2, _G_G-01_3)
      else if (code.includes('_G_G-01_')) {
        priorYearAdjustments += value;
      }
      // Surplus/Deficit of Period is _G_4 (not in G-01 subcategory)
      else if (code.includes('_G_4') && !code.includes('G-01')) {
        surplusDeficitPeriod = value;
      }
    });
    
    // Also check computedValues for Surplus/Deficit of Period (C = A - B)
    if (surplusDeficitPeriod === 0 && computedValues.surplusDeficit) {
      surplusDeficitPeriod = typeof computedValues.surplusDeficit === 'object'
        ? Number(computedValues.surplusDeficit[quarter]) || 0
        : Number(computedValues.surplusDeficit) || 0;
    }
    
    // Also check computedValues.surplus for Surplus/Deficit of Period
    if (surplusDeficitPeriod === 0 && computedValues.surplus) {
      surplusDeficitPeriod = typeof computedValues.surplus === 'object'
        ? Number(computedValues.surplus[quarter]) || 0
        : Number(computedValues.surplus) || 0;
    }
    
    closingBalanceTotal = accumulatedSurplus + priorYearAdjustments + surplusDeficitPeriod;
    console.log('[Rollover] Calculated G. Closing Balance total:', {
      accumulatedSurplus,
      priorYearAdjustments,
      surplusDeficitPeriod,
      closingBalanceTotal
    });
  }
  
  closingBalances.closingBalanceTotal = closingBalanceTotal;
  
  console.log('[Rollover] Final closingBalances:', {
    D: Object.keys(closingBalances.D).length,
    E: Object.keys(closingBalances.E).length,
    G: closingBalances.G,
    GKeys: Object.keys(closingBalances.G),
    closingBalanceTotal: closingBalances.closingBalanceTotal
  });

  return closingBalances;
}

/**
 * Calculate totals from closing balances
 */
function calculateTotals(execution: any): { financialAssets: number; financialLiabilities: number; netFinancialAssets: number } {
  const quarter = execution.formData?.context?.quarter?.toLowerCase() || 'q1';
  
  // Try to get from computedValues first
  if (execution.computedValues) {
    const financialAssets = Number(execution.computedValues.financialAssets?.[quarter]) || 0;
    const financialLiabilities = Number(execution.computedValues.financialLiabilities?.[quarter]) || 0;
    const netFinancialAssets = Number(execution.computedValues.netFinancialAssets?.[quarter]) || 0;
    
    return {
      financialAssets,
      financialLiabilities,
      netFinancialAssets,
    };
  }

  // Fallback: calculate from UI totals
  const ui = execution.ui || {};
  const financialAssets = Number(ui.D?.total) || 0;
  const financialLiabilities = Number(ui.E?.total) || 0;
  const netFinancialAssets = financialAssets - financialLiabilities;

  return {
    financialAssets,
    financialLiabilities,
    netFinancialAssets,
  };
}
