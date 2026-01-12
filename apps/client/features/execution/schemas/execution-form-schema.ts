import { z } from "zod"

console.log('🟢 [execution-form-schema.ts] MODULE LOADED - Cumulative balance functions available');

// Constants for projects
export const PROJECTS = [
  "HIV NSP BUDGET SUPPORT",
  "MALARIA CONTROL",
  "TB PROGRAM",
] as const

export const PROJECT_DISPLAY_NAMES: Record<string, string> = {
  "HIV NSP BUDGET SUPPORT": "HIV NSP BUDGET SUPPORT..",
  "MALARIA CONTROL": "MALARIA CONTROL",
  "TB PROGRAM": "TB PROGRAM",
}

// Constants for reporting periods
export const REPORTING_PERIODS = [
  "JULY - SEPTEMBER / 2023",
  "OCTOBER - DECEMBER / 2023",
  "JANUARY - MARCH / 2024",
  "APRIL - JUNE / 2024",
] as const

export const PERIOD_END_DATES: Record<string, string> = {
  "JULY - SEPTEMBER / 2023": "30/09/2023",
  "OCTOBER - DECEMBER / 2023": "31/12/2023",
  "JANUARY - MARCH / 2024": "31/03/2024",
  "APRIL - JUNE / 2024": "30/06/2024",
}

// Define the financial row type before defining the schema
export type FinancialRow = {
  id: string
  executionId?: number
  title: string
  q1?: number
  q2?: number
  q3?: number
  q4?: number
  cumulativeBalance?: number
  comments?: string
  isCategory?: boolean
  children?: FinancialRow[]
  isEditable?: boolean
  isCalculated?: boolean // New: indicates if field is auto-calculated
  calculationSource?: string // New: indicates source of calculation (e.g., "planning_data")
  isTotalRow?: boolean
  // VAT-specific fields (for VAT-applicable expenses)
  netAmount?: {
    q1?: number
    q2?: number
    q3?: number
    q4?: number
  }
  vatAmount?: {
    q1?: number
    q2?: number
    q3?: number
    q4?: number
  }
}

// Schema for a financial row item - can have children for hierarchical structure
export const financialRowSchema: z.ZodType<FinancialRow> = z.lazy(() => 
  z.object({
    id: z.string(),
    executionId: z.number().optional(),
    title: z.string(),
    q1: z.number().optional(),
    q2: z.number().optional(),
    q3: z.number().optional(),
    q4: z.number().optional(),
    cumulativeBalance: z.number().optional(),
    comments: z.string().optional(),
    isCategory: z.boolean().optional(),
    children: z.array(financialRowSchema).optional(),
    isEditable: z.boolean().optional().default(true),
    isCalculated: z.boolean().optional(),
    calculationSource: z.string().optional(),
    isTotalRow: z.boolean().optional(),
    netAmount: z.object({
      q1: z.number().optional(),
      q2: z.number().optional(),
      q3: z.number().optional(),
      q4: z.number().optional(),
    }).optional(),
    vatAmount: z.object({
      q1: z.number().optional(),
      q2: z.number().optional(),
      q3: z.number().optional(),
      q4: z.number().optional(),
    }).optional(),
  })
)

// Retain the old line item schema for compatibility
export const financialLineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(), // 1, 2, or 3 depending on hierarchy
  parentId: z.string().optional(), // Reference to parent item for hierarchy
  q1: z.number().optional(),
  q2: z.number().optional(),
  q3: z.number().optional(),
  q4: z.number().optional(),
  cumulative: z.number().optional(), // Can be calculated
  comments: z.string().optional(),
  isCalculated: z.boolean().optional(), // If true, sum of child items
  isEditable: z.boolean().optional(), // If false, calculated or header row
})

export type FinancialLineItem = z.infer<typeof financialLineItemSchema>

// Constants for the financial report structure
export const REPORT_SECTIONS = {
  RECEIPTS: 'A',
  EXPENDITURES: 'B',
  SURPLUS_DEFICIT: 'C',
  FINANCIAL_ASSETS: 'D',
  FINANCIAL_LIABILITIES: 'E',
  NET_FINANCIAL_ASSETS: 'F',
  CLOSING_BALANCES: 'G',
}

// Expenditure subsections
export const EXPENDITURE_SUBSECTIONS = {
  HUMAN_RESOURCES: '01',
  MONITORING_EVALUATION: '02',
  LIVING_SUPPORT: '03',
  OVERHEADS: '04',
  TRANSFERS: '05',
}

/**
 * Determines if a Section G activity is a flow item (cumulative sum) or stock item (latest quarter)
 * @param id - Activity ID
 * @param title - Activity title/name
 * @returns true if flow item, false if stock item
 */
function isSectionGFlowItem(id: string, title: string): boolean {
  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Flow indicators: accumulated, surplus, deficit, period, revenue, expense, income
  const flowKeywords = [
    'accumulated', 'surplus', 'deficit', 'period', 'revenue', 
    'expense', 'income', 'expenditure', 'receipt', 'flow'
  ];
  
  // Stock indicators: balance, opening, closing, asset, liability, position
  const stockKeywords = [
    'opening', 'asset', 'liability', 'position', 'stock'
  ];
  
  // Check ID and title for flow keywords
  const hasFlowKeyword = flowKeywords.some(keyword => 
    idLower.includes(keyword) || titleLower.includes(keyword)
  );
  
  // Check ID and title for stock keywords
  const hasStockKeyword = stockKeywords.some(keyword => 
    idLower.includes(keyword) || titleLower.includes(keyword)
  );
  
  // If both or neither found, default to flow (cumulative sum)
  // This aligns with the requirement that most G items are flows
  if (hasFlowKeyword && !hasStockKeyword) {
    return true;
  } else if (hasStockKeyword && !hasFlowKeyword) {
    return false;
  } else {
    // Default to flow (cumulative sum) for Section G
    return true;
  }
}

/**
 * Gets the latest non-zero quarter value
 * Checks quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
 * @param q1 - Quarter 1 value
 * @param q2 - Quarter 2 value
 * @param q3 - Quarter 3 value
 * @param q4 - Quarter 4 value
 * @returns Latest non-zero quarter value, or 0 if all are zero
 */
function getLatestQuarterValue(q1: number, q2: number, q3: number, q4: number): number {
  console.log(`[getLatestQuarterValue] Input: Q1=${q1}, Q2=${q2}, Q3=${q3}, Q4=${q4}`);
  
  // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
  if (q4 !== 0) {
    console.log(`[getLatestQuarterValue] Returning Q4: ${q4}`);
    return q4;
  }
  if (q3 !== 0) {
    console.log(`[getLatestQuarterValue] Returning Q3: ${q3}`);
    return q3;
  }
  if (q2 !== 0) {
    console.log(`[getLatestQuarterValue] Returning Q2: ${q2}`);
    return q2;
  }
  if (q1 !== 0) {
    console.log(`[getLatestQuarterValue] Returning Q1: ${q1}`);
    return q1;
  }
  console.log(`[getLatestQuarterValue] All zeros, returning 0`);
  return 0;
}

/**
 * Calculates cumulative balance based on section type
 * Flow sections (A, B, C) use cumulative sum across all quarters (income statement items)
 * Stock sections (D, E, F) use the latest non-zero quarter value (balance sheet items)
 * Section G uses intelligent detection based on activity ID/title
 * 
 * Note: F = D - E (Net Financial Assets), so F inherits stock behavior from its components
 * 
 * @param q1 - Quarter 1 value
 * @param q2 - Quarter 2 value
 * @param q3 - Quarter 3 value
 * @param q4 - Quarter 4 value
 * @param id - Row ID for section detection
 * @param title - Row title for Section G detection
 * @returns Calculated cumulative balance
 */
function calculateCumulativeBalance(
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  id: string,
  title: string
): number {
  const idUpper = id.toUpperCase();
  const sectionCode = idUpper.charAt(0);
  
  console.log(`[calculateCumulativeBalance] ID: ${id}, Title: ${title}, Section: ${sectionCode}`);
  console.log(`[calculateCumulativeBalance] Quarters: Q1=${q1}, Q2=${q2}, Q3=${q3}, Q4=${q4}`);
  
  // Flow-based sections: cumulative sum (A, B, C, and flow items in G)
  // Income statement items that accumulate over time
  const flowSections = ['A', 'B', 'C'];
  
  // Stock-based sections: latest quarter (D, E, F, and stock items in G)
  // Balance sheet items that represent position at a point in time
  // Note: F = D - E, so F inherits stock behavior from its components
  const stockSections = ['D', 'E', 'F'];
  
  if (flowSections.includes(sectionCode)) {
    // Cumulative sum for flow sections
    const result = q1 + q2 + q3 + q4;
    console.log(`[calculateCumulativeBalance] Flow section - Cumulative sum: ${result}`);
    return result;
  } else if (stockSections.includes(sectionCode)) {
    // Latest non-zero quarter for stock sections
    console.log(`[calculateCumulativeBalance] Stock section - Using latest quarter`);
    const result = getLatestQuarterValue(q1, q2, q3, q4);
    console.log(`[calculateCumulativeBalance] Stock section result: ${result}`);
    return result;
  } else if (sectionCode === 'G') {
    // Section G: intelligent detection based on activity ID/title
    // Default to cumulative sum (most G items are flows like accumulated balances and surplus/deficit)
    const isFlow = isSectionGFlowItem(id, title);
    console.log(`[calculateCumulativeBalance] Section G - isFlow: ${isFlow}`);
    if (isFlow) {
      const result = q1 + q2 + q3 + q4;
      console.log(`[calculateCumulativeBalance] Section G flow - Cumulative sum: ${result}`);
      return result;
    } else {
      console.log(`[calculateCumulativeBalance] Section G stock - Using latest quarter`);
      const result = getLatestQuarterValue(q1, q2, q3, q4);
      console.log(`[calculateCumulativeBalance] Section G stock result: ${result}`);
      return result;
    }
  } else {
    // Default to cumulative sum for unknown sections
    const result = q1 + q2 + q3 + q4;
    console.log(`[calculateCumulativeBalance] Unknown section - Default cumulative sum: ${result}`);
    return result;
  }
}

/**
 * Helper function to check if an activity is VAT-applicable based on its title
 * VAT-applicable expenses: Communication - All, Maintenance, Fuel, Office Supplies
 */
function isVATApplicableActivity(title: string): boolean {
  const titleLower = title.toLowerCase();
  return (
    (titleLower.includes('communication') && titleLower.includes('all')) ||
    titleLower.includes('maintenance') ||
    titleLower === 'fuel' ||
    titleLower.includes('fuel') ||
    titleLower.includes('office supplies')
  );
}

/**
 * Helper function to extract net amount from q1/q2/q3/q4 values for VAT expenses
 * For VAT expenses, q1/q2/q3/q4 contain total invoice (net + VAT)
 * We need to check if netAmount is populated, otherwise calculate it
 */
function ensureNetAmountPopulated(row: FinancialRow): FinancialRow {
  // Only process if this looks like a VAT-applicable expense
  if (!isVATApplicableActivity(row.title)) {
    return row;
  }

  // If netAmount is already populated, use it
  if (row.netAmount && (row.netAmount.q1 || row.netAmount.q2 || row.netAmount.q3 || row.netAmount.q4)) {
    console.log(`✅ [ensureNetAmountPopulated] ${row.id} already has netAmount`, row.netAmount);
    return row;
  }

  // If netAmount is not populated but we have q1/q2/q3/q4 values,
  // we need to use the q1/q2/q3/q4 as-is (they should be net amounts)
  // This is a fallback for when data isn't properly structured
  console.log(`⚠️ [ensureNetAmountPopulated] ${row.id} missing netAmount, using q1/q2/q3/q4 as net`, {
    q1: row.q1,
    q2: row.q2,
    q3: row.q3,
    q4: row.q4,
  });

  return {
    ...row,
    netAmount: {
      q1: row.q1,
      q2: row.q2,
      q3: row.q3,
      q4: row.q4,
    }
  };
}

// Helper function to calculate totals for a hierarchical financial structure
export function calculateHierarchicalTotals(rows: FinancialRow[]): FinancialRow[] {
  console.log('🔵 [calculateHierarchicalTotals] FUNCTION CALLED - Starting calculation');
  console.log('🔵 [calculateHierarchicalTotals] Number of rows:', rows.length);
  
  const result = [...rows]
  
  // First pass: Calculate child sums and cumulative balances for each row
  const calculateRowTotals = (row: FinancialRow): FinancialRow => {
    // Ensure netAmount is populated for VAT-applicable expenses
    const newRow = ensureNetAmountPopulated({ ...row })
    
    console.log(`\n[calculateRowTotals] Processing row: ${newRow.id} - ${newRow.title}`);
    console.log(`[calculateRowTotals] Initial values: Q1=${newRow.q1}, Q2=${newRow.q2}, Q3=${newRow.q3}, Q4=${newRow.q4}`);
    
    // If the row has children, calculate their totals first
    if (newRow.children && newRow.children.length > 0) {
      console.log(`[calculateRowTotals] Row has ${newRow.children.length} children`);
      newRow.children = newRow.children.map((child: FinancialRow) => calculateRowTotals(child))
      
      // Initialize quarter sums
      let q1Sum = 0
      let q2Sum = 0
      let q3Sum = 0
      let q4Sum = 0
      
      // Sum up child values
      // For VAT-applicable expenses, use net amount instead of total invoice
      for (const child of newRow.children) {
        // Check if child has VAT data (netAmount field exists and has values)
        const hasVATData = child.netAmount && (
          child.netAmount.q1 || child.netAmount.q2 || 
          child.netAmount.q3 || child.netAmount.q4
        );
        
        console.log(`[calculateRowTotals] 🔍 Checking child: ${child.id} - ${child.title}`, {
          hasNetAmount: !!child.netAmount,
          netAmount: child.netAmount,
          hasVATData,
          q1: child.q1,
          q2: child.q2,
          q3: child.q3,
          q4: child.q4,
        });
        
        if (hasVATData) {
          // Use net amounts for VAT-applicable expenses
          q1Sum += child.netAmount?.q1 || 0
          q2Sum += child.netAmount?.q2 || 0
          q3Sum += child.netAmount?.q3 || 0
          q4Sum += child.netAmount?.q4 || 0
          console.log(`[calculateRowTotals] ✅ Using net amount for VAT expense: ${child.id}`, {
            netQ1: child.netAmount?.q1,
            netQ2: child.netAmount?.q2,
            netQ3: child.netAmount?.q3,
            netQ4: child.netAmount?.q4,
          });
        } else {
          // Use regular amounts for non-VAT expenses
          q1Sum += child.q1 || 0
          q2Sum += child.q2 || 0
          q3Sum += child.q3 || 0
          q4Sum += child.q4 || 0
          console.log(`[calculateRowTotals] ⚪ Using regular amount for non-VAT expense: ${child.id}`);
        }
      }
      
      console.log(`[calculateRowTotals] Child sums: Q1=${q1Sum}, Q2=${q2Sum}, Q3=${q3Sum}, Q4=${q4Sum}`);
      
      // Only set values for category rows that should be calculated
      if (newRow.isCategory) {
        newRow.q1 = q1Sum || undefined
        newRow.q2 = q2Sum || undefined
        newRow.q3 = q3Sum || undefined
        newRow.q4 = q4Sum || undefined
        console.log(`[calculateRowTotals] Category row updated with child sums`);
      }
    }
    
    // Calculate cumulative balance using intelligent section detection
    const q1Val = newRow.q1 || 0;
    const q2Val = newRow.q2 || 0;
    const q3Val = newRow.q3 || 0;
    const q4Val = newRow.q4 || 0;
    
    console.log(`[calculateRowTotals] Calculating cumulative balance for: ${newRow.id}`);
    const cumulativeBalance = calculateCumulativeBalance(
      q1Val, q2Val, q3Val, q4Val, newRow.id, newRow.title
    );
    
    newRow.cumulativeBalance = cumulativeBalance !== 0 ? cumulativeBalance : undefined
    console.log(`[calculateRowTotals] Final cumulative balance: ${newRow.cumulativeBalance}`);
    
    return newRow
  }
  
  // First pass: Calculate regular totals (child sums and cumulative balances)
  const calculatedRows = result.map(row => calculateRowTotals(row))
  
  // Second pass: Apply special formulas for specific sections
  // Find the main section rows by ID
  const findRowById = (id: string): FinancialRow | undefined => 
    calculatedRows.find(row => row.id === id)
  
  const receiptRow = findRowById('A')
  const expenditureRow = findRowById('B')
  const surplusRow = findRowById('C')
  const finAssetsRow = findRowById('D')
  const finLiabilitiesRow = findRowById('E')
  const netAssetsRow = findRowById('F')
  const closingBalanceRow = findRowById('G')
  
  // Formula 3: Calculate Surplus/Deficit (A - B)
  if (surplusRow && receiptRow && expenditureRow) {
    surplusRow.q1 = (receiptRow.q1 || 0) - (expenditureRow.q1 || 0)
    surplusRow.q2 = (receiptRow.q2 || 0) - (expenditureRow.q2 || 0)
    surplusRow.q3 = (receiptRow.q3 || 0) - (expenditureRow.q3 || 0)
    surplusRow.q4 = (receiptRow.q4 || 0) - (expenditureRow.q4 || 0)
    
    // Recalculate cumulative balance after updating quarters
    surplusRow.cumulativeBalance = (surplusRow.q1 || 0) + (surplusRow.q2 || 0) + 
      (surplusRow.q3 || 0) + (surplusRow.q4 || 0)
  }

  
  // Formula 4 & 5: Calculate Net Financial Assets (F = D - E)
  if (netAssetsRow && finAssetsRow && finLiabilitiesRow) {
    netAssetsRow.q1 = (finAssetsRow.q1 || 0) - (finLiabilitiesRow.q1 || 0)
    netAssetsRow.q2 = (finAssetsRow.q2 || 0) - (finLiabilitiesRow.q2 || 0)
    netAssetsRow.q3 = (finAssetsRow.q3 || 0) - (finLiabilitiesRow.q3 || 0)
    netAssetsRow.q4 = (finAssetsRow.q4 || 0) - (finLiabilitiesRow.q4 || 0)
    
    // CRITICAL FIX: F is a stock section (balance sheet item)
    // Since F = D - E and both D and E are stock items (use latest quarter),
    // F should also use latest quarter logic, NOT sum all quarters
    // Use the latest non-zero quarter value
    netAssetsRow.cumulativeBalance = getLatestQuarterValue(
      netAssetsRow.q1 || 0,
      netAssetsRow.q2 || 0,
      netAssetsRow.q3 || 0,
      netAssetsRow.q4 || 0
    )
  }

  // Formula 6: Calculate Closing Balance (G1 + G2 + G3)
  if (closingBalanceRow && closingBalanceRow.children) {
    const accumulatedSurplus = closingBalanceRow.children.find(row => row.id === 'G1' || row.id === 'g1')
    const priorYearAdjustment = closingBalanceRow.children.find(row => row.id === 'G2' || row.id === 'g2')
    const periodSurplus = closingBalanceRow.children.find(row => row.id === 'G3' || row.id === 'g3')
    
    // Set the surplus/deficit of the period to match section C
    if (periodSurplus && surplusRow) {
      periodSurplus.q1 = surplusRow.q1
      periodSurplus.q2 = surplusRow.q2
      periodSurplus.q3 = surplusRow.q3
      periodSurplus.q4 = surplusRow.q4
      periodSurplus.cumulativeBalance = surplusRow.cumulativeBalance
    }
    
    // Calculate total closing balance for each quarter
    if (accumulatedSurplus && priorYearAdjustment && periodSurplus) {
      closingBalanceRow.q1 = (accumulatedSurplus.q1 || 0) + (priorYearAdjustment.q1 || 0) + (periodSurplus.q1 || 0)
      closingBalanceRow.q2 = (accumulatedSurplus.q2 || 0) + (priorYearAdjustment.q2 || 0) + (periodSurplus.q2 || 0)
      closingBalanceRow.q3 = (accumulatedSurplus.q3 || 0) + (priorYearAdjustment.q3 || 0) + (periodSurplus.q3 || 0)
      closingBalanceRow.q4 = (accumulatedSurplus.q4 || 0) + (priorYearAdjustment.q4 || 0) + (periodSurplus.q4 || 0)
      
      // Calculate cumulative balance
      closingBalanceRow.cumulativeBalance = (closingBalanceRow.q1 || 0) + 
        (closingBalanceRow.q2 || 0) + 
        (closingBalanceRow.q3 || 0) + 
        (closingBalanceRow.q4 || 0)
    }
  }

  return calculatedRows
}



// Function to generate an empty financial report template with the standard structure
export function generateEmptyFinancialTemplate(): FinancialRow[] {
  return [
    {
      id: "A",
      title: "A. Receipts",
      isCategory: true,
      children: [
        { id: "A1", title: "Other Incomes" },
        { 
          id: "A2", 
          title: "Transfers from SPIU/RBC",
          isCalculated: false, // Will be set to true when auto-filled from planning data
          calculationSource: "planning_data"
        },
      ],
    },
    {
      id: "B",
      title: "B. Expenditures",
      isCategory: true,
      children: [
        {
          id: "B01",
          title: "01. Human Resources + BONUS",
          isCategory: true,
          children: [
            { id: "B01-1", title: "Laboratory Technician" },
            { id: "B01-2", title: "Nurse" },
          ],
        },
        {
          id: "B02",
          title: "02. Monitoring & Evaluation",
          isCategory: true,
          children: [
            { id: "B02-1", title: "Supervision CHWs" },
            { id: "B02-2", title: "Support group meetings" },
          ],
        },
        {
          id: "B03",
          title: "03. Living Support to Clients/Target Populations",
          isCategory: true,
          children: [
            { id: "B03-1", title: "Sample transport" },
            { id: "B03-2", title: "Home visit lost to follow up" },
            { id: "B03-3", title: "Transport and travel for survey/surveillance" },
          ],
        },
        {
          id: "B04",
          title: "04. Overheads (22 - Use of goods & services)",
          isCategory: true,
          children: [
            { id: "B04-1", title: "Infrastructure support" },
            { id: "B04-2", title: "Office supplies" },
            { id: "B04-3", title: "Transport and travel (Reporting)" },
            { id: "B04-4", title: "Bank charges" },
          ],
        },
        {
          id: "B05",
          title: "05. Transfer to other reporting entities",
          isCategory: true,
          children: [
            { id: "B05-1", title: "Transfer to RBC" },
          ],
        },
      ],
    },
    {
      id: "C",
      title: "C. SURPLUS / DEFICIT",
      isCategory: true,
      isEditable: false, // This is calculated
    },
    {
      id: "D",
      title: "D. Financial Assets",
      isCategory: true,
      children: [
        { id: "D1", title: "Cash at bank" },
        { id: "D2", title: "Petty cash" },
        { id: "D3", title: "Receivables (VAT refund)" },
        { id: "D4", title: "Other Receivables" },
      ],
    },
    {
      id: "E",
      title: "E. Financial Liabilities",
      isCategory: true,
      children: [
        { id: "E1", title: "Salaries on borrowed funds (BONUS)" },
        { id: "E2", title: "Payable - Maintenance & Repairs" },
        { id: "E3", title: "Payable - Office suppliers" },
        { id: "E4", title: "Payable - Transportation fees" },
        { id: "E5", title: "VAT refund to RBC" },
      ],
    },
    {
      id: "F",
      title: "F. Net Financial Assets",
      isCategory: true,
      isEditable: false, // This is calculated
    },
    {
      id: "G",
      title: "G. Closing Balance",
      isCategory: true,
      isEditable: false, // This is calculated
      children: [
        { 
          id: "G1", 
          title: "Accumulated Surplus/Deficit",
          isEditable: true // This is manually entered
        },
        { 
          id: "G2", 
          title: "Prior Year Adjustment",
          isEditable: true // This is manually entered
        },
        { 
          id: "G3", 
          title: "Surplus/Deficit of the Period",
          isEditable: false // This is calculated from section C
        }
      ]
    }
  ]
}

// Schema for a financial item (used in the new format)
export const financialItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  type: z.enum(["category", "line_item"]),
  level: z.number(),
  parentId: z.string().nullable(),
  isEditable: z.boolean().default(true),
  isCalculated: z.boolean().default(false),
  values: z.object({
    q1: z.number().nullable(),
    q2: z.number().nullable(),
    q3: z.number().nullable(),
    q4: z.number().nullable(),
    cumulativeBalance: z.number().nullable(),
    comments: z.string().nullable()
  }),
  metadata: z.object({
    formula: z.string().optional(), // e.g., "A - B" for SURPLUS/DEFICIT
    category: z.enum([
      "receipts",
      "expenditures",
      "surplus_deficit",
      "financial_assets",
      "financial_liabilities",
      "net_assets",
      "closing_balances"
    ]).optional(),
    subCategory: z.string().optional(), // e.g., "human_resources", "monitoring_evaluation"
    sortOrder: z.number().optional()
  })
})

// Schema for the entire financial report (new format)
export const financialReportSchema = z.object({
  id: z.string().optional(), // For database persistence
  version: z.string(), // e.g., "1.0.0"
  fiscalYear: z.string(),
  reportingPeriod: z.string(),
  // TODO: question about these statuses
  status: z.enum(["draft", "submitted", "approved", "rejected"]).default("draft"),
  metadata: z.object({
    facility: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      district: z.string(),
      code: z.string().optional()
    }),
    project: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string().optional()
    }).optional(),
    createdBy: z.string().optional(),
    createdAt: z.string().optional(), // ISO date string
    updatedBy: z.string().optional(),
    updatedAt: z.string().optional(), // ISO date string
    submittedAt: z.string().optional(), // ISO date string
    approvedAt: z.string().optional(), // ISO date string
    approvedBy: z.string().optional()
  }),
  items: z.array(financialItemSchema),
  totals: z.object({
    receipts: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    expenditures: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    surplusDeficit: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    financialAssets: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    financialLiabilities: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    netAssets: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    closingBalances: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    })
  }),
  validation: z.object({
    isBalanced: z.boolean(),
    errors: z.array(z.object({
      code: z.string(),
      message: z.string(),
      itemId: z.string().optional(),
      severity: z.enum(["error", "warning", "info"])
    })).optional(),
    lastValidatedAt: z.string().optional() // ISO date string
  }).optional()
})

// Type definitions
export type FinancialItem = z.infer<typeof financialItemSchema>
export type FinancialReport = z.infer<typeof financialReportSchema>
export type FinancialReportData = FinancialReport // Alias for backward compatibility

// Helper function to convert the old format to the new format
export function normalizeFinancialData(oldData: any): FinancialReport {
  const items: FinancialItem[] = [];
  const reportTotals = {
    receipts: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    expenditures: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    surplusDeficit: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    financialAssets: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    financialLiabilities: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    netAssets: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 },
    closingBalances: { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
  };

  // Helper function to process items recursively
  function processItem(item: any, level: number, parentId: string | null = null): void {
    const category = getCategoryFromId(item.id);
    const normalizedItem: FinancialItem = {
      id: item.id,
      code: item.id, // Using id as code for now
      title: item.title,
      type: item.isCategory ? "category" : "line_item",
      level,
      parentId,
      isEditable: item.isEditable !== false,
      isCalculated: ["c", "f", "g", "C", "F", "G"].includes(item.id), // SURPLUS/DEFICIT, NET ASSETS, CLOSING BALANCES
      values: {
        q1: item.q1 ?? null,
        q2: item.q2 ?? null,
        q3: item.q3 ?? null,
        q4: item.q4 ?? null,
        cumulativeBalance: item.cumulativeBalance ?? null,
        comments: item.comments ?? null
      },
      metadata: {
        category,
        subCategory: getSubCategoryFromId(item.id),
        sortOrder: getSortOrderFromId(item.id)
      }
    };

    items.push(normalizedItem);

    // Update totals based on category
    if (item.isCategory && category) {
      updateTotals(item, category, reportTotals);
    }

    // Process children recursively
    if (item.children) {
      item.children.forEach((child: any) => processItem(child, level + 1, item.id));
    }
  }

  // Process all top-level items
  oldData.tableData.forEach((item: any) => processItem(item, 1));

  // Create the normalized report
  const normalizedReport: FinancialReport = {
    version: "1.0.0",
    fiscalYear: oldData.metadata.fiscalYear,
    reportingPeriod: oldData.metadata.reportingPeriod,
    status: "draft",
    metadata: {
      facility: {
        id: "temp-id", // This should come from your backend
        name: oldData.metadata.healthCenter,
        type: "health_center", // This should come from your backend
        district: oldData.metadata.district,
        code: oldData.metadata.healthCenter.toUpperCase().replace(/\s+/g, '_')
      },
      project: oldData.metadata.project ? {
        id: "temp-project-id", // This should come from your backend
        name: oldData.metadata.project,
        code: oldData.metadata.project.toUpperCase().replace(/\s+/g, '_')
      } : undefined
    },
    items,
    totals: reportTotals,
    validation: {
      isBalanced: true, // This should be calculated
      errors: []
    }
  };

  return normalizedReport;
}

// Helper functions for metadata
function getCategoryFromId(id: string | number | undefined): FinancialItem["metadata"]["category"] {
  if (id === undefined || id === null) return undefined;
  const str = String(id).toLowerCase();
  const categoryMap: Record<string, FinancialItem["metadata"]["category"]> = {
    "a": "receipts",
    "b": "expenditures",
    "c": "surplus_deficit",
    "d": "financial_assets",
    "e": "financial_liabilities",
    "f": "net_assets",
    "g": "closing_balances"
  };
  return categoryMap[str.charAt(0)] || undefined;
}

function getSubCategoryFromId(id: string | number): string | undefined {
  const str = String(id).toLowerCase();
  if (str.length <= 1) return undefined;
  const subCategoryMap: Record<string, string> = {
    "b01": "human_resources",
    "b02": "monitoring_evaluation",
    "b03": "living_support",
    "b04": "overheads",
    "b05": "transfers"
  };
  return subCategoryMap[str.substring(0, 3)] || undefined;
}

function getSortOrderFromId(id: string | number): number {
  const str = String(id).toLowerCase();
  const baseOrder = str.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, etc.
  if (str.length === 1) return baseOrder * 1000;
  
  const subOrder = parseInt(str.substring(1).replace(/\D/g, '')) || 0;
  return baseOrder * 1000 + subOrder;
}

function updateTotals(
  item: any, 
  category: NonNullable<FinancialItem["metadata"]["category"]>,
  totals: FinancialReport["totals"]
): void {
  const target = category === "receipts" ? "receipts" :
                category === "expenditures" ? "expenditures" :
                category === "surplus_deficit" ? "surplusDeficit" :
                category === "financial_assets" ? "financialAssets" :
                category === "financial_liabilities" ? "financialLiabilities" :
                category === "net_assets" ? "netAssets" :
                "closingBalances";

  totals[target].q1 += item.q1 || 0;
  totals[target].q2 += item.q2 || 0;
  totals[target].q3 += item.q3 || 0;
  totals[target].q4 += item.q4 || 0;
  totals[target].cumulativeBalance += item.cumulativeBalance || 0;
}

// Remove the grouped export since we already have individual exports
// export { financialItemSchema, financialReportSchema }; 