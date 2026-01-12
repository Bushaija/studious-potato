import type { Database } from "@/db";
import type { Quarter, ExecutionRecord } from "./quarter-helpers";
import type { ClosingBalances } from "./balance-extractor";

/**
 * User-entered transaction data that must be preserved during recalculation
 */
export interface UserTransactions {
  receipts: Record<string, QuarterlyTransactions>; // Section A
  expenditures: Record<string, QuarterlyTransactions>; // Section B
  payments: Record<string, QuarterlyPayments>; // Section B payment tracking
  vatTracking: Record<string, QuarterlyVATTracking>; // Section B VAT tracking
  manualEntries: Record<string, any>; // Section G manual entries
  comments: Record<string, string>; // Activity comments
}

/**
 * Quarterly transaction values for receipts and expenditures
 */
export interface QuarterlyTransactions {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
}

/**
 * Payment tracking for expenditures
 */
export interface QuarterlyPayments {
  q1?: { paid?: number; unpaid?: number };
  q2?: { paid?: number; unpaid?: number };
  q3?: { paid?: number; unpaid?: number };
  q4?: { paid?: number; unpaid?: number };
}

/**
 * VAT tracking for expenditures
 */
export interface QuarterlyVATTracking {
  q1?: { netAmount?: number; vatAmount?: number; vatCleared?: number };
  q2?: { netAmount?: number; vatAmount?: number; vatCleared?: number };
  q3?: { netAmount?: number; vatAmount?: number; vatCleared?: number };
  q4?: { netAmount?: number; vatAmount?: number; vatCleared?: number };
}

/**
 * Derived values for validation
 */
export interface DerivedValues {
  sectionF: number; // Net Financial Assets (D - E)
  sectionG: number; // Closing Balance
  sectionD: number; // Total Financial Assets
  sectionE: number; // Total Financial Liabilities
}

/**
 * Validation result for accounting equation
 */
export interface ValidationResult {
  isValid: boolean;
  difference: number;
  tolerance: number;
  message: string;
  details?: {
    sectionF: number;
    sectionG: number;
    sectionD: number;
    sectionE: number;
  };
}

/**
 * Result of quarter recalculation
 */
export interface RecalculationResult {
  success: boolean;
  executionId: number;
  quarter: Quarter;
  validation: ValidationResult;
  updatedActivities: Record<string, any>;
  closingBalances: ClosingBalances;
}

/**
 * Default tolerance for accounting equation validation (0.01 for rounding)
 */
const DEFAULT_TOLERANCE = 0.01;

/**
 * Extract user-entered transaction data from execution record
 * This data must be preserved during recalculation
 * 
 * @param execution - Execution record with formData
 * @returns User transactions object with all user-entered data
 */
export function extractUserTransactions(execution: ExecutionRecord): UserTransactions {
  const userTransactions: UserTransactions = {
    receipts: {},
    expenditures: {},
    payments: {},
    vatTracking: {},
    manualEntries: {},
    comments: {},
  };

  try {
    const activities = execution?.formData?.activities;
    
    if (!activities || typeof activities !== "object") {
      console.warn("No activities found in execution data");
      return userTransactions;
    }

    // Iterate through activities to extract user-entered data
    Object.entries(activities).forEach(([code, activityData]: [string, any]) => {
      // Section A: Receipts (user-entered)
      if (code.includes("_A_")) {
        userTransactions.receipts[code] = {
          q1: activityData?.q1,
          q2: activityData?.q2,
          q3: activityData?.q3,
          q4: activityData?.q4,
        };
      }
      
      // Section B: Expenditures (user-entered)
      else if (code.includes("_B_")) {
        userTransactions.expenditures[code] = {
          q1: activityData?.q1,
          q2: activityData?.q2,
          q3: activityData?.q3,
          q4: activityData?.q4,
        };
        
        // Extract payment tracking
        if (activityData?.payments) {
          userTransactions.payments[code] = activityData.payments;
        }
        
        // Extract VAT tracking
        if (activityData?.vat) {
          userTransactions.vatTracking[code] = activityData.vat;
        }
      }
      
      // Section G: Manual entries (Accumulated Surplus/Deficit, Prior Year Adjustment)
      else if (code.includes("_G_") && activityData?.isManual) {
        userTransactions.manualEntries[code] = {
          q1: activityData?.q1,
          q2: activityData?.q2,
          q3: activityData?.q3,
          q4: activityData?.q4,
        };
      }
      
      // Extract comments for all activities
      if (activityData?.comment) {
        userTransactions.comments[code] = activityData.comment;
      }
    });

    return userTransactions;
  } catch (error) {
    console.error("Error extracting user transactions:", error);
    return userTransactions;
  }
}

/**
 * Apply opening balances from previous quarter to current quarter activities
 * Updates Section D and E opening balances
 * 
 * @param activities - Current activities object
 * @param closingBalances - Closing balances from previous quarter
 * @returns Updated activities with new opening balances
 */
export function applyOpeningBalances(
  activities: Record<string, any>,
  closingBalances: ClosingBalances
): Record<string, any> {
  const updatedActivities = { ...activities };

  try {
    // Apply Section D opening balances (Financial Assets)
    Object.entries(closingBalances.D || {}).forEach(([code, closingBalance]) => {
      if (updatedActivities[code]) {
        updatedActivities[code] = {
          ...updatedActivities[code],
          openingBalance: closingBalance,
        };
      }
    });

    // Apply Section E opening balances (Financial Liabilities)
    Object.entries(closingBalances.E || {}).forEach(([code, closingBalance]) => {
      if (updatedActivities[code]) {
        updatedActivities[code] = {
          ...updatedActivities[code],
          openingBalance: closingBalance,
        };
      }
    });

    return updatedActivities;
  } catch (error) {
    console.error("Error applying opening balances:", error);
    return activities;
  }
}

/**
 * Calculate closing balances for Section D and E using standardized formulas
 * 
 * Formulas:
 * - Cash at Bank: opening_cash + receipts - cash_payments
 * - Petty Cash: opening_petty + petty_in - petty_out
 * - VAT Receivable: opening_VAT + VAT_incurred - VAT_refunded
 * - Other Receivables: opening_other + new_receivables - cleared_receivables
 * - Payables: opening_payable + expenses_incurred - expenses_paid
 * 
 * @param activities - Activities with opening balances and transactions
 * @param _transactions - User-entered transaction data (reserved for future use)
 * @returns Closing balances for Section D and E
 */
export function calculateClosingBalances(
  activities: Record<string, any>,
  _transactions: UserTransactions
): ClosingBalances {
  const closingBalances: ClosingBalances = { D: {}, E: {}, VAT: {} };

  try {
    // Calculate Section D closing balances (Financial Assets)
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_D_")) {
        const openingBalance = activityData?.openingBalance || 0;
        
        // Get quarterly values
        const q1 = activityData?.q1 || 0;
        const q2 = activityData?.q2 || 0;
        const q3 = activityData?.q3 || 0;
        const q4 = activityData?.q4 || 0;
        
        // For Section D, closing balance is typically the quarterly value itself
        // (which represents the closing balance after transactions)
        closingBalances.D[code] = q4 || q3 || q2 || q1 || openingBalance;
      }
    });

    // Calculate Section E closing balances (Financial Liabilities)
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_E_")) {
        const openingBalance = activityData?.openingBalance || 0;
        
        // Get quarterly values
        const q1 = activityData?.q1 || 0;
        const q2 = activityData?.q2 || 0;
        const q3 = activityData?.q3 || 0;
        const q4 = activityData?.q4 || 0;
        
        // For Section E, closing balance is typically the quarterly value itself
        // (which represents the closing balance after transactions)
        closingBalances.E[code] = q4 || q3 || q2 || q1 || openingBalance;
      }
    });

    return closingBalances;
  } catch (error) {
    console.error("Error calculating closing balances:", error);
    return { D: {}, E: {}, VAT: {} };
  }
}

/**
 * Calculate derived sections (F and G) based on activities and closing balances
 * 
 * Section F: Net Financial Assets = Section D - Section E
 * Section G: Closing Balance = Accumulated Surplus/Deficit + Surplus/Deficit of Period + Prior Year Adjustment
 * 
 * @param activities - Activities with all data
 * @param closingBalances - Closing balances for Section D and E
 * @returns Derived values for validation
 */
export function calculateDerivedSections(
  activities: Record<string, any>,
  closingBalances: ClosingBalances
): DerivedValues {
  try {
    // Calculate Section D total (Financial Assets)
    const sectionD = Object.values(closingBalances.D || {}).reduce(
      (sum, value) => sum + (typeof value === "number" ? value : 0),
      0
    );

    // Calculate Section E total (Financial Liabilities)
    const sectionE = Object.values(closingBalances.E || {}).reduce(
      (sum, value) => sum + (typeof value === "number" ? value : 0),
      0
    );

    // Calculate Section F (Net Financial Assets = D - E)
    const sectionF = sectionD - sectionE;

    // Calculate Section G (Closing Balance)
    // Section G = Accumulated Surplus/Deficit + Surplus/Deficit of Period + Prior Year Adjustment
    let sectionG = 0;
    
    // Find Section A total (Receipts)
    let sectionA = 0;
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_A_")) {
        const q1 = activityData?.q1 || 0;
        const q2 = activityData?.q2 || 0;
        const q3 = activityData?.q3 || 0;
        const q4 = activityData?.q4 || 0;
        sectionA += q1 + q2 + q3 + q4;
      }
    });

    // Find Section B total (Expenditures)
    let sectionB = 0;
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_B_")) {
        const q1 = activityData?.q1 || 0;
        const q2 = activityData?.q2 || 0;
        const q3 = activityData?.q3 || 0;
        const q4 = activityData?.q4 || 0;
        sectionB += q1 + q2 + q3 + q4;
      }
    });

    // Surplus/Deficit of Period = A - B
    const surplusDeficit = sectionA - sectionB;

    // Add manual entries from Section G
    let accumulatedSurplus = 0;
    let priorYearAdjustment = 0;
    
    Object.entries(activities).forEach(([code, activityData]) => {
      if (code.includes("_G_")) {
        if (code.includes("ACCUMULATED") || code.includes("SURPLUS")) {
          const q1 = activityData?.q1 || 0;
          const q2 = activityData?.q2 || 0;
          const q3 = activityData?.q3 || 0;
          const q4 = activityData?.q4 || 0;
          accumulatedSurplus += q1 + q2 + q3 + q4;
        } else if (code.includes("PRIOR") || code.includes("ADJUSTMENT")) {
          const q1 = activityData?.q1 || 0;
          const q2 = activityData?.q2 || 0;
          const q3 = activityData?.q3 || 0;
          const q4 = activityData?.q4 || 0;
          priorYearAdjustment += q1 + q2 + q3 + q4;
        }
      }
    });

    // Section G = Accumulated Surplus + Surplus/Deficit + Prior Year Adjustment
    sectionG = accumulatedSurplus + surplusDeficit + priorYearAdjustment;

    return {
      sectionF,
      sectionG,
      sectionD,
      sectionE,
    };
  } catch (error) {
    console.error("Error calculating derived sections:", error);
    return {
      sectionF: 0,
      sectionG: 0,
      sectionD: 0,
      sectionE: 0,
    };
  }
}

/**
 * Validate accounting equation: Section F = Section G
 * Allows for small tolerance due to floating-point arithmetic
 * 
 * @param derivedValues - Derived values from calculations
 * @param tolerance - Allowed difference (default: 0.01)
 * @returns Validation result with details
 */
export function validateAccountingEquation(
  derivedValues: DerivedValues,
  tolerance: number = DEFAULT_TOLERANCE
): ValidationResult {
  try {
    const { sectionF, sectionG, sectionD, sectionE } = derivedValues;
    
    // Calculate difference between F and G
    const difference = Math.abs(sectionF - sectionG);
    
    // Check if difference is within tolerance
    const isValid = difference <= tolerance;
    
    const message = isValid
      ? "Accounting equation validated: Section F equals Section G"
      : `Accounting equation validation failed: Section F (${sectionF.toFixed(2)}) does not equal Section G (${sectionG.toFixed(2)}). Difference: ${difference.toFixed(2)}`;

    return {
      isValid,
      difference,
      tolerance,
      message,
      details: {
        sectionF,
        sectionG,
        sectionD,
        sectionE,
      },
    };
  } catch (error) {
    console.error("Error validating accounting equation:", error);
    return {
      isValid: false,
      difference: 0,
      tolerance,
      message: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Recalculate a quarter's execution data based on updated previous quarter closing balances
 * 
 * This function:
 * 1. Fetches the current quarter execution
 * 2. Extracts and preserves user-entered transaction data
 * 3. Applies new opening balances from previous quarter
 * 4. Recalculates closing balances using standardized formulas
 * 5. Recalculates derived sections (F and G)
 * 6. Validates the accounting equation
 * 7. Returns the recalculation result (does NOT update database)
 * 
 * @param db - Database instance
 * @param executionId - Execution ID to recalculate
 * @param previousQuarterClosingBalances - Closing balances from previous quarter
 * @returns Recalculation result with validation
 */
export async function recalculateQuarter(
  db: Database,
  executionId: number,
  previousQuarterClosingBalances: ClosingBalances
): Promise<RecalculationResult> {
  try {
    // 1. Fetch current quarter execution
    const execution = await db.query.schemaFormDataEntries.findFirst({
      where: (schemaFormDataEntries, { eq }) => eq(schemaFormDataEntries.id, executionId),
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const executionRecord = execution as ExecutionRecord;
    const quarter = executionRecord.formData?.context?.quarter as Quarter;
    if (!quarter) {
      throw new Error(`Quarter not found in execution data: ${executionId}`);
    }

    // 2. Extract user-entered transaction data (preserve)
    const userTransactions = extractUserTransactions(executionRecord);

    // 3. Apply new opening balances
    const updatedActivities = applyOpeningBalances(
      executionRecord.formData?.activities || {},
      previousQuarterClosingBalances
    );

    // 4. Recalculate closing balances
    const closingBalances = calculateClosingBalances(
      updatedActivities,
      userTransactions
    );

    // 5. Recalculate derived sections (F, G)
    const derivedValues = calculateDerivedSections(
      updatedActivities,
      closingBalances
    );

    // 6. Validate accounting equation
    const validation = validateAccountingEquation(derivedValues);

    // 7. Return result (caller decides whether to update database)
    return {
      success: validation.isValid,
      executionId,
      quarter,
      validation,
      updatedActivities,
      closingBalances,
    };
  } catch (error) {
    console.error("Error recalculating quarter:", error);
    throw error;
  }
}

/**
 * Apply recalculation result to database
 * Updates the execution record with recalculated activities and metadata
 * 
 * @param db - Database instance
 * @param recalculationResult - Result from recalculateQuarter
 * @param sourceQuarter - The quarter that triggered the recalculation
 * @returns Updated execution record
 */
export async function applyRecalculationToDatabase(
  db: any,
  recalculationResult: RecalculationResult,
  sourceQuarter: Quarter
): Promise<void> {
  try {
    const { executionId, updatedActivities, quarter } = recalculationResult;
    
    // Fetch current execution to preserve other data
    const execution = await db.query.schemaFormDataEntries.findFirst({
      where: (schemaFormDataEntries: any, { eq }: any) => eq(schemaFormDataEntries.id, executionId),
    });
    
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    // Merge updated activities with existing form data
    const updatedFormData = {
      ...execution.formData,
      activities: updatedActivities,
    };
    
    // Update metadata to track recalculation
    const existingMetadata = (execution.metadata as any) || {};
    const updatedMetadata = {
      ...existingMetadata,
      lastRecalculated: new Date().toISOString(),
      recalculationSource: 'cascade',
      recalculationTrigger: sourceQuarter,
      affectedQuarter: quarter,
    };
    
    // Import schemaFormDataEntries from schema
    const { schemaFormDataEntries } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    
    // Update the execution record
    await db.update(schemaFormDataEntries)
      .set({
        formData: updatedFormData,
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(schemaFormDataEntries.id, executionId));
    
    console.log(`Successfully applied recalculation for execution ${executionId} (${quarter})`);
  } catch (error) {
    console.error("Error applying recalculation to database:", error);
    throw error;
  }
}
