import React, { createContext, useContext } from 'react';
import type { PreviousQuarterBalances } from '@/features/execution/types/quarterly-rollover';

type PaymentStatus = "paid" | "unpaid" | "partial";

interface ValidationResult {
  isValid: boolean;
  error?: string;
  maxAllowableAmount?: number;
}

/**
 * Execution Form Context Value
 * 
 * This context provides all the state and methods needed for the execution form,
 * including support for Section X (Miscellaneous Adjustments) double-entry accounting.
 */
interface ExecutionFormContextValue {
  /** Form data containing all activity values, payment statuses, and VAT information */
  formData: Record<string, any>;
  
  /** Server-computed values for validation and display */
  computedValues: Record<string, any> | null;
  
  /** Update a field value for an activity */
  onFieldChange: (activityCode: string, value: number) => void;
  
  /** Update the comment for an activity */
  onCommentChange: (activityCode: string, comment: string) => void;
  
  /** Update payment status and amount paid for an expense */
  updateExpensePayment: (activityCode: string, status: PaymentStatus, amountPaid: number) => void;
  
  /** Update net amount and VAT amount for a VAT-applicable expense */
  updateVATExpense: (activityCode: string, netAmount: number, vatAmount: number) => void;
  
  /** Clear (pay) a portion of VAT receivable */
  clearVAT: (activityCode: string, clearAmount: number) => void;
  
  /** Clear (pay) a portion of payable (liability) */
  clearPayable: (payableCode: string, clearAmount: number) => void;
  
  /** Clear (collect) a portion of other receivable */
  clearOtherReceivable: (receivableCode: string, clearAmount: number) => void;
  
  /** Apply prior year adjustment for payable or receivable */
  applyPriorYearAdjustment: (priorYearAdjustmentCode: string, targetItemCode: string, adjustmentType: 'increase' | 'decrease', amount: number) => void;
  
  /** Apply prior year cash adjustment with double-entry (Cash at Bank and G both change) */
  applyPriorYearCashAdjustment: (cashAdjustmentCode: string, adjustmentType: 'increase' | 'decrease', amount: number) => void;
  
  /** Validation errors for form fields */
  validationErrors: Record<string, any>;
  
  /** Client-side validation errors (Requirements: 11.1-11.5) */
  clientValidationErrors?: Array<{ field: string; message: string; type: 'error' | 'warning' }>;
  
  /** Whether calculations are in progress */
  isCalculating: boolean;
  
  /** Whether validation is in progress */
  isValidating: boolean;
  
  /** Whether Section F (Net Financial Assets) equals Section G (Closing Balance) */
  isBalanced: boolean;
  
  /** Difference between Section F and Section G */
  difference: number;
  
  /** Hierarchical table structure built from activities schema */
  table: Array<Record<string, any>>;
  
  // Helper methods
  
  /** Check if a quarter is editable (current quarter only) */
  isQuarterEditable: (q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  
  /** Check if a quarter is visible (current and previous quarters) */
  isQuarterVisible: (q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  
  /** Get calculated totals for a section */
  getSectionTotals: (sectionId: string) => { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number };
  
  /** Get the state of a row (editable, calculated, validation) */
  getRowState: (code: string) => { isEditable: boolean; isCalculated: boolean; validationMessage?: string };
  
  /** Check if a specific row and quarter combination is locked */
  isRowLocked: (code: string, q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  
  /** Expand/collapse state for sections and subcategories */
  expandState: Record<string, boolean>;
  
  /** Toggle expand/collapse for a section or subcategory */
  onToggleSection: (id: string) => void;
  
  // Section X (Miscellaneous Adjustments) - Double-Entry Accounting Support
  
  /**
   * Validation result for Section X Other Receivable input
   * 
   * This validates that:
   * - The amount is non-negative
   * - The amount doesn't exceed available Cash at Bank
   * - The input is numeric
   * 
   * When validation fails, the error message and max allowable amount are provided
   * to help the user correct their input.
   */
  miscValidationError?: ValidationResult | null;
  
  /**
   * Activity code for the Section X Other Receivable field
   * 
   * This is used to identify which field triggered the validation error
   * and to link the Section X input with the auto-calculated Section D fields.
   */
  otherReceivableCode?: string | null;
  
  /**
   * Previous quarter balances for rollover calculations
   * Used to initialize opening balances for VAT receivables, other receivables, and payables
   */
  previousQuarterBalances?: PreviousQuarterBalances | null;
  
  /**
   * Real-time calculated Surplus/Deficit (A - B)
   * This is optimized for faster UI updates when Section A or B values change
   */
  realTimeSurplusDeficit?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    cumulativeBalance: number;
  };
}

const ExecutionFormContext = createContext<ExecutionFormContextValue | null>(null);

export const ExecutionFormProvider: React.FC<{
  value: ExecutionFormContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <ExecutionFormContext.Provider value={value}>
      {children}
    </ExecutionFormContext.Provider>
  );
};

export const useExecutionFormContext = () => {
  const context = useContext(ExecutionFormContext);
  if (!context) {
    throw new Error('useExecutionFormContext must be used within ExecutionFormProvider');
  }
  return context;
};

// Debug component to help troubleshoot
export const ExecutionFormDebugPanel: React.FC = () => {
  const ctx = useExecutionFormContext();
  const sampleForm = Object.values(ctx.formData)[0] || {};
  const sampleComputed = ctx.computedValues || {};

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono">
      <h4 className="font-bold mb-2">Execution Debug Info:</h4>
      <div className="space-y-2">
        <div>
          <strong>Form Data Keys:</strong> {Object.keys(ctx.formData).join(', ')}
        </div>
        <div>
          <strong>Is Balanced:</strong> {String(ctx.isBalanced)} | <strong>Δ(F-G):</strong> {ctx.difference}
        </div>
        <div>
          <strong>Sample Activity (form):</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(sampleForm, null, 2)}</pre>
        </div>
        <div>
          <strong>Computed Values (server):</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(sampleComputed, null, 2)}</pre>
        </div>
        <div>
          <strong>Validation Errors:</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(ctx.validationErrors, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};


