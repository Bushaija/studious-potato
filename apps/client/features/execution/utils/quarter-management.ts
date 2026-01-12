/**
 * Fiscal year quarters:
 * Q1: Jul - Sep
 * Q2: Oct - Dec  
 * Q3: Jan - Mar
 * Q4: Apr - Jun
 */

export interface QuarterInfo {
  quarter: 1 | 2 | 3 | 4;
  name: string;
  months: string;
  startMonth: number; // 0-based month index
  endMonth: number;   // 0-based month index
  fiscalYear: number;
}

export interface ActiveQuartersResult {
  currentQuarter: QuarterInfo;
  activeQuarters: (1 | 2 | 3 | 4)[];
  availableQuarters: (1 | 2 | 3 | 4)[];
  disabledQuarters: (1 | 2 | 3 | 4)[];
}

/**
 * Get fiscal year quarters information
 */
export function getFiscalQuarters(fiscalYear: number): QuarterInfo[] {
  return [
    {
      quarter: 1,
      name: "Q1",
      months: "Jul - Sep",
      startMonth: 6, // July (0-based)
      endMonth: 8,   // September (0-based)
      fiscalYear
    },
    {
      quarter: 2,
      name: "Q2", 
      months: "Oct - Dec",
      startMonth: 9, // October (0-based)
      endMonth: 11,  // December (0-based)
      fiscalYear
    },
    {
      quarter: 3,
      name: "Q3",
      months: "Jan - Mar", 
      startMonth: 0, // January (0-based) - next calendar year
      endMonth: 2,   // March (0-based)
      fiscalYear: fiscalYear + 1 // Calendar year changes
    },
    {
      quarter: 4,
      name: "Q4",
      months: "Apr - Jun",
      startMonth: 3, // April (0-based)
      endMonth: 5,   // June (0-based) 
      fiscalYear: fiscalYear + 1 // Calendar year changes
    }
  ];
}

/**
 * Determine current fiscal quarter based on current date
 */
export function getCurrentFiscalQuarter(currentDate: Date = new Date()): QuarterInfo {
  const currentMonth = currentDate.getMonth(); // 0-based
  const currentYear = currentDate.getFullYear();
  
  // Determine fiscal year based on current month
  let fiscalYear: number;
  if (currentMonth >= 6) { // July onwards = current fiscal year
    fiscalYear = currentYear;
  } else { // Jan-June = previous fiscal year
    fiscalYear = currentYear - 1;
  }
  
  const quarters = getFiscalQuarters(fiscalYear);
  
  // Find which quarter we're currently in
  for (const quarter of quarters) {
    const isInQuarter = isDateInQuarter(currentDate, quarter);
    if (isInQuarter) {
      return quarter;
    }
  }
  
  // Fallback to Q1 if no match (shouldn't happen)
  return quarters[0];
}

/**
 * Check if a date falls within a specific quarter
 */
function isDateInQuarter(date: Date, quarter: QuarterInfo): boolean {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Handle quarters that cross calendar years (Q3, Q4)
  if (quarter.quarter === 3 || quarter.quarter === 4) {
    return year === quarter.fiscalYear && 
           month >= quarter.startMonth && 
           month <= quarter.endMonth;
  } else {
    // Q1, Q2 are within the same calendar year as fiscal year start
    return year === quarter.fiscalYear && 
           month >= quarter.startMonth && 
           month <= quarter.endMonth;
  }
}

/**
 * Determine which quarters are active for execution reporting
 * Returns current quarter + all previous quarters in the fiscal year
 */
export function getActiveQuarters(currentDate: Date = new Date()): ActiveQuartersResult {
  const currentQuarter = getCurrentFiscalQuarter(currentDate);
  const allQuarters: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  
  // Active quarters: current quarter + all previous quarters
  const activeQuarters: (1 | 2 | 3 | 4)[] = [];
  for (let q = 1; q <= currentQuarter.quarter; q++) {
    activeQuarters.push(q as 1 | 2 | 3 | 4);
  }
  
  // Available quarters for reporting (same as active for now)
  const availableQuarters = [...activeQuarters];
  
  // Disabled quarters: future quarters that shouldn't be reported yet
  const disabledQuarters = allQuarters.filter(q => !activeQuarters.includes(q));
  
  return {
    currentQuarter,
    activeQuarters,
    availableQuarters, 
    disabledQuarters
  };
}

/**
 * Get current quarter for execution forms
 * Returns the quarter string format expected by EnhancedExecutionForm
 */
export function getCurrentQuarterForExecution(): "Q1" | "Q2" | "Q3" | "Q4" {
  const currentQuarter = getCurrentFiscalQuarter();
  return `Q${currentQuarter.quarter}` as "Q1" | "Q2" | "Q3" | "Q4";
}

/**
 * Filter planning totals to only include active quarters
 */
export function filterPlanningTotalsForActiveQuarters(
  planningTotals: { q1: number; q2: number; q3: number; q4: number; total: number },
  activeQuarters: (1 | 2 | 3 | 4)[]
): { q1: number; q2: number; q3: number; q4: number; total: number } {
  const filtered = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
  
  if (activeQuarters.includes(1)) {
    filtered.q1 = planningTotals.q1;
    filtered.total += planningTotals.q1;
  }
  if (activeQuarters.includes(2)) {
    filtered.q2 = planningTotals.q2;
    filtered.total += planningTotals.q2;
  }
  if (activeQuarters.includes(3)) {
    filtered.q3 = planningTotals.q3;
    filtered.total += planningTotals.q3;
  }
  if (activeQuarters.includes(4)) {
    filtered.q4 = planningTotals.q4;
    filtered.total += planningTotals.q4;
  }
  
  return filtered;
}

/**
 * Check if a quarter should be disabled for input
 */
export function isQuarterDisabled(quarter: 1 | 2 | 3 | 4, currentDate: Date = new Date()): boolean {
  const { disabledQuarters } = getActiveQuarters(currentDate);
  return disabledQuarters.includes(quarter);
}

/**
 * Generate quarter labels with active/disabled status
 */
export function generateQuarterLabelsWithStatus(currentDate: Date = new Date()) {
  const { activeQuarters, disabledQuarters } = getActiveQuarters(currentDate);
  const quarters = getFiscalQuarters(getCurrentFiscalQuarter(currentDate).fiscalYear);
  
  return quarters.map(quarter => ({
    quarter: quarter.quarter,
    line1: quarter.name,
    line2: quarter.months,
    isActive: activeQuarters.includes(quarter.quarter),
    isDisabled: disabledQuarters.includes(quarter.quarter),
    isCurrent: getCurrentFiscalQuarter(currentDate).quarter === quarter.quarter
  }));
} 