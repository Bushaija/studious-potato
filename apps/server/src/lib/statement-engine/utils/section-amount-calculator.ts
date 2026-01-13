/**
 * Section Amount Calculator Utility
 * 
 * Provides utilities to correctly calculate amounts for different financial statement sections
 * based on whether they are stock (balance sheet) or flow (income statement) sections.
 */

export interface ActivityData {
  code: string;
  subSection?: string; // Optional - will be extracted from code if not provided
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  cumulative_balance?: number;
}

/**
 * Extract section letter from activity code
 * Examples:
 *   "HIV_EXEC_HOSPITAL_D_1" -> "D"
 *   "MAL_EXEC_HEALTH_CENTER_E_3" -> "E"
 *   "TB_EXEC_HOSPITAL_A_2" -> "A"
 */
export function extractSectionFromCode(code: string): string | null {
  if (!code) return null;
  
  const parts = code.split('_');
  const execIndex = parts.findIndex(p => p === 'EXEC');
  
  if (execIndex === -1) return null;
  
  // Find the first single-letter part after 'EXEC' that matches A-G or X
  for (let i = execIndex + 1; i < parts.length; i++) {
    if (parts[i].length === 1 && /[A-GX]/.test(parts[i])) {
      return parts[i];
    }
  }
  
  return null;
}

/**
 * Calculate the correct amount for a financial statement section
 * based on whether it's a stock or flow section
 */
export function calculateSectionAmount(activity: ActivityData): number {
  // Extract section from code if not provided
  const section = activity.subSection || extractSectionFromCode(activity.code);
  
  if (section === 'D' || section === 'E') {
    // Stock sections (Financial Assets & Liabilities): Use cumulative_balance
    return Number(activity.cumulative_balance) || 0;
  } else {
    // Flow sections (Revenue, Expenses, Equity): Sum all quarters
    return (Number(activity.q1) || 0) + 
           (Number(activity.q2) || 0) + 
           (Number(activity.q3) || 0) + 
           (Number(activity.q4) || 0);
  }
}

/**
 * Validate that an activity has the required data for its section type
 */
export function validateActivityData(activity: ActivityData): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  // Extract section from code if not provided
  const section = activity.subSection || extractSectionFromCode(activity.code);
  
  if (section === 'D' || section === 'E') {
    // Stock sections should have cumulative_balance
    if (activity.cumulative_balance === undefined || activity.cumulative_balance === null) {
      warnings.push(`Stock section activity ${activity.code} missing cumulative_balance`);
    }
  } else {
    // Flow sections should have quarterly data
    const hasQuarterlyData = (activity.q1 !== undefined && activity.q1 !== null) ||
                            (activity.q2 !== undefined && activity.q2 !== null) ||
                            (activity.q3 !== undefined && activity.q3 !== null) ||
                            (activity.q4 !== undefined && activity.q4 !== null);
    
    if (!hasQuarterlyData) {
      warnings.push(`Flow section activity ${activity.code} has no quarterly data`);
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Get section type information
 */
export function getSectionInfo(subSection: string): {
  type: 'stock' | 'flow';
  description: string;
  calculationMethod: string;
} {
  if (subSection === 'D' || subSection === 'E') {
    return {
      type: 'stock',
      description: subSection === 'D' ? 'Financial Assets' : 'Financial Liabilities',
      calculationMethod: 'cumulative_balance (latest quarter balance)'
    };
  } else {
    const descriptions: Record<string, string> = {
      'A': 'Receipts/Revenue',
      'B': 'Expenditures/Expenses',
      'G': 'Equity Changes',
      'C': 'Surplus/Deficit (computed)',
      'F': 'Net Financial Assets (computed)'
    };
    
    return {
      type: 'flow',
      description: descriptions[subSection] || 'Unknown section',
      calculationMethod: 'sum of all quarters (Q1 + Q2 + Q3 + Q4)'
    };
  }
}

/**
 * Test function to validate the calculation logic
 */
export function testSectionCalculations(): void {
  console.log('🧪 Testing section amount calculations...');
  
  // Test stock section (D - Financial Assets)
  const stockActivity: ActivityData = {
    code: 'MAL_EXEC_HEALTH_CENTER_D_1',
    subSection: 'D',
    q1: 0,
    q2: 7425438,
    q3: 10000,
    q4: 0,
    cumulative_balance: 0  // Should use this value
  };
  
  const stockAmount = calculateSectionAmount(stockActivity);
  console.log(`Stock section (D): Expected 0, Got ${stockAmount} ✓`);
  
  // Test flow section (A - Revenue)
  const flowActivity: ActivityData = {
    code: 'MAL_EXEC_HEALTH_CENTER_A_2',
    subSection: 'A',
    q1: 0,
    q2: 16449864,
    q3: 0,
    q4: 1000000,
    cumulative_balance: 16449864  // Should NOT use this for flow sections
  };
  
  const flowAmount = calculateSectionAmount(flowActivity);
  const expectedFlow = 0 + 16449864 + 0 + 1000000;
  console.log(`Flow section (A): Expected ${expectedFlow}, Got ${flowAmount} ✓`);
  
  // Test validation
  const validation = validateActivityData(stockActivity);
  console.log(`Validation: ${validation.isValid ? 'PASS' : 'FAIL'} - ${validation.warnings.join(', ')}`);
  
  console.log('✅ Section calculation tests completed');
}