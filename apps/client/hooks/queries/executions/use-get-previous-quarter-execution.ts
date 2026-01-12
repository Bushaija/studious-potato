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
}

/**
 * Get the previous quarter identifier
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
 * For Q1 or when previous quarter doesn't exist, returns null data.
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
}: UseGetPreviousQuarterExecutionParams) {
  const previousQuarter = getPreviousQuarter(currentQuarter);
  
  // Only fetch if we have a previous quarter and all required IDs
  const shouldFetch = Boolean(
    enabled &&
    previousQuarter &&
    projectId &&
    facilityId &&
    reportingPeriodId
  );

  return useQuery({
    queryKey: [
      "execution",
      "previous-quarter",
      projectId,
      facilityId,
      reportingPeriodId,
      currentQuarter,
      previousQuarter,
    ],
    queryFn: async () => {
      if (!previousQuarter || !projectId || !facilityId || !reportingPeriodId) {
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

      // Fetch executions for the previous quarter
      const response = await getExecutions({
        projectId,
        facilityId,
        reportingPeriodId,
        quarter: previousQuarter,
        limit: 1,
      });

      // Check if we found a previous quarter execution
      if (response.data && response.data.length > 0) {
        const previousExecution = response.data[0];
        
        // Extract closing balances from the previous execution
        // The API response includes previousQuarterBalances for each execution
        const previousQuarterBalances: PreviousQuarterBalances = {
          exists: true,
          quarter: previousQuarter,
          executionId: previousExecution.id,
          closingBalances: extractClosingBalances(previousExecution),
          totals: calculateTotals(previousExecution),
        };

        const quarterSequence: QuarterSequence = {
          current: currentQuarter,
          previous: previousQuarter,
          next: getNextQuarter(currentQuarter),
          hasPrevious: true,
          hasNext: getNextQuarter(currentQuarter) !== null,
          isFirstQuarter: false,
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
          previous: previousQuarter,
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
 */
function extractClosingBalances(execution: any): { D: Record<string, number>; E: Record<string, number>; VAT: Record<string, number> } {
  const closingBalances = { D: {}, E: {}, VAT: {} } as { D: Record<string, number>; E: Record<string, number>; VAT: Record<string, number> };

  // Extract from formData.activities, vatReceivables, or ui structure
  const activities = execution.formData?.activities || {};
  const vatReceivables = execution.formData?.vatReceivables || {};
  const ui = execution.ui || {};

  // Get the quarter key
  const quarter = execution.formData?.context?.quarter?.toLowerCase() || 'q1';

  // Extract Section D (Financial Assets) closing balances
  if (ui.D?.items) {
    ui.D.items.forEach((item: any) => {
      if (item.code && item[quarter] !== undefined) {
        closingBalances.D[item.code] = Number(item[quarter]) || 0;
      }
    });
  } else {
    // Fallback to activities
    Object.entries(activities).forEach(([code, data]: [string, any]) => {
      if (code.includes('_D_') && data[quarter] !== undefined) {
        closingBalances.D[code] = Number(data[quarter]) || 0;
      }
    });
  }

  // VAT receivables are already included in ui.D.items with correct activity codes
  // (e.g., HIV_EXEC_HOSPITAL_D_VAT_AIRTIME), so no need to add them separately
  // The extraction above (lines 179-185) already handles them correctly
  console.log('[Rollover] VAT receivables already included in Section D items');
  console.log('Final Section D balances:', JSON.parse(JSON.stringify(closingBalances.D)));

  // Extract Section E (Financial Liabilities) closing balances
  if (ui.E?.items) {
    ui.E.items.forEach((item: any) => {
      if (item.code && item[quarter] !== undefined) {
        closingBalances.E[item.code] = Number(item[quarter]) || 0;
      }
    });
  } else {
    // Fallback to activities
    Object.entries(activities).forEach(([code, data]: [string, any]) => {
      if (code.includes('_E_') && data[quarter] !== undefined) {
        closingBalances.E[code] = Number(data[quarter]) || 0;
      }
    });
  }

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
