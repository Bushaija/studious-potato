/**
 * Quarterly Balance Rollover Types
 * 
 * These types match the backend Zod schemas defined in:
 * apps/server/src/api/routes/execution/execution.types.ts
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

/**
 * Quarter identifier type
 */
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Closing balances from previous quarter execution
 * Used for quarterly rollover calculations
 */
export interface ClosingBalances {
  /** Section D (Financial Assets) closing balances by activity code */
  D: Record<string, number>;
  /** Section E (Financial Liabilities) closing balances by activity code */
  E: Record<string, number>;
  /** Section G (Closing Balance / Equity) closing balances by activity code */
  G: Record<string, number>;
  /** VAT Receivables closing balances by category code */
  VAT: Record<string, number>;
  /** G. Closing Balance total from previous fiscal year (used as Accumulated Surplus for new year) */
  closingBalanceTotal?: number;
}

/**
 * Computed totals for financial sections
 */
export interface BalanceTotals {
  /** Total Section D (Financial Assets) */
  financialAssets: number;
  /** Total Section E (Financial Liabilities) */
  financialLiabilities: number;
  /** Net Financial Assets (D - E) */
  netFinancialAssets: number;
}

/**
 * Previous quarter balances for rollover calculations
 * Used to initialize opening balances for the current quarter
 */
export interface PreviousQuarterBalances {
  /** Whether previous quarter data exists */
  exists: boolean;
  /** Previous quarter identifier (Q1, Q2, Q3, or Q4) */
  quarter: Quarter | null;
  /** Previous quarter execution ID */
  executionId: number | null;
  /** Closing balances from previous quarter */
  closingBalances: ClosingBalances | null;
  /** Computed totals from previous quarter */
  totals: BalanceTotals | null;
}

/**
 * Quarter sequence metadata for navigation and validation
 */
export interface QuarterSequence {
  /** Current quarter */
  current: Quarter;
  /** Previous quarter or null if Q1 (unless cross-fiscal-year rollover) */
  previous: Quarter | null;
  /** Next quarter or null if Q4 */
  next: Quarter | null;
  /** Whether a previous quarter exists */
  hasPrevious: boolean;
  /** Whether a next quarter exists */
  hasNext: boolean;
  /** Whether this is Q1 */
  isFirstQuarter: boolean;
  /** Whether the previous quarter is from a different fiscal year (Q4 → Q1 rollover) */
  isCrossFiscalYearRollover?: boolean;
}

/**
 * Cascade recalculation impact metadata
 * Returned when updating a quarter affects subsequent quarters
 */
export interface CascadeImpact {
  /** List of quarters affected by this update */
  affectedQuarters: Quarter[];
  /** Quarters recalculated synchronously */
  immediatelyRecalculated: Quarter[];
  /** Quarters queued for background recalculation */
  queuedForRecalculation: Quarter[];
  /** Recalculation status */
  status: "none" | "partial_complete" | "complete";
}

/**
 * Enhanced execution response with quarterly rollover data
 * Extends the base execution response with previous quarter balances and quarter sequence
 */
export interface EnhancedExecutionResponse {
  /** Execution data entry */
  entry: any; // Using any to avoid circular dependencies with existing execution types
  /** UI structure data */
  ui?: Record<string, any>;
  /** Previous quarter closing balances for rollover */
  previousQuarterBalances: PreviousQuarterBalances;
  /** Quarter navigation metadata */
  quarterSequence: QuarterSequence;
  /** Cascade recalculation impact metadata (optional, only present after updates) */
  cascadeImpact?: CascadeImpact;
}
