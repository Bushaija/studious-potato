import { useMemo } from 'react';
import { generateExpenseToPayableMapping } from '../utils/expense-to-payable-mapping';
import { isVATApplicable, getVATCategory, type VATApplicableCategory } from '../utils/vat-applicable-expenses';
import { getVATCategoryFromCode } from '../utils/vat-to-section-d-mapping';
import type { PreviousQuarterBalances } from '../types/quarterly-rollover';

/**
 * Payment status for an expense
 */
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

/**
 * Expense form data with payment information and VAT tracking
 */
export interface ExpenseFormData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  // Payment status can be either a single value (old format) or quarter-specific (new format)
  paymentStatus?: PaymentStatus | Record<string, PaymentStatus>;
  amountPaid?: number | Record<string, number>;
  // VAT tracking fields (quarter-specific)
  netAmount?: Record<string, number>;      // Net amount per quarter (for VAT-applicable expenses)
  vatAmount?: Record<string, number>;      // VAT amount per quarter (for VAT-applicable expenses)
  vatCleared?: Record<string, number>;     // VAT cleared per quarter (for VAT-applicable expenses)
  // Payable tracking fields (quarter-specific)
  payableCleared?: Record<string, number>; // Payable cleared per quarter (for payables in Section E)
}

/**
 * Parameters for the expense calculations hook
 */
export interface UseExpenseCalculationsParams {
  formData: Record<string, ExpenseFormData>;
  openingBalance: number;  // DEPRECATED: Use previousQuarterBalances instead
  activities: any;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  otherReceivableAmount?: number;  // Amount from Section X Miscellaneous Adjustments
  previousQuarterBalances?: PreviousQuarterBalances;  // NEW: Previous quarter closing balances for rollover
}

/**
 * Return value from the expense calculations hook
 */
export interface UseExpenseCalculationsReturn {
  cashAtBank: number;
  payables: Record<string, number>;
  vatReceivables: Record<string, number>;  // NEW: VAT receivables by category
  totalExpenses: number;
  totalPaid: number;
  totalUnpaid: number;
  totalVATReceivable: number;  // NEW: Total VAT receivable across all categories
  totalVATCleared: number;     // NEW: Total VAT cleared across all categories
}

/**
 * Custom hook to calculate Cash at Bank, Payables, and VAT Receivables from expense payment data
 * 
 * ## Purpose
 * This hook performs all financial calculations for the execution form, including:
 * - Cash at Bank calculation with double-entry accounting for Other Receivables
 * - Payables calculation by category based on unpaid expenses
 * - VAT receivables calculation by category for VAT-applicable expenses
 * - Quarterly balance rollover from previous quarter closing balances
 * 
 * ## Quarterly Balance Rollover (NEW)
 * The hook now supports quarter-to-quarter balance continuity:
 * 
 * Opening Balance(Q(n)) = Closing Balance(Q(n-1))
 * 
 * When previousQuarterBalances is provided:
 * - Cash at Bank opening balance comes from previous quarter's closing cash
 * - Payables opening balances come from previous quarter's unpaid payables
 * - VAT Receivables opening balances come from previous quarter's uncleared VAT
 * 
 * For Q1 or when previous quarter doesn't exist:
 * - Falls back to the openingBalance parameter (backward compatibility)
 * - Initializes with zero balances for payables and VAT receivables
 * 
 * ## Cash at Bank Calculation (Double-Entry Accounting)
 * The Cash at Bank calculation implements proper double-entry accounting:
 * 
 * Cash at Bank = Opening Balance - Total Paid + Total VAT Cleared - Other Receivable Amount
 * 
 * Where:
 * - Opening Balance: Starting cash position (from previous quarter or parameter)
 * - Total Paid: Sum of all paid expenses (reduces cash)
 * - Total VAT Cleared: VAT refunds received from government (increases cash)
 * - Other Receivable Amount: Miscellaneous receivables from Section X (reduces cash)
 * 
 * The Other Receivable adjustment ensures that when an accountant records a receivable,
 * the corresponding cash reduction is automatically applied, maintaining accounting integrity.
 * 
 * ## Payables Calculation
 * - Starts with previous quarter's unpaid payables (if available)
 * - Adds current quarter's unpaid expenses
 * - Maps expenses to their corresponding payable categories in Section E
 * - Excludes VAT amounts for VAT-applicable expenses (VAT is tracked separately)
 * 
 * ## VAT Receivables Calculation
 * - Starts with previous quarter's uncleared VAT (if available)
 * - Adds current quarter's VAT amounts
 * - Subtracts current quarter's VAT cleared amounts
 * - Tracks VAT receivables separately from regular payables
 * 
 * ## Performance Optimization
 * - Uses useMemo to avoid unnecessary recalculations
 * - Memoizes expense-to-payable mapping
 * - Memoizes VAT-applicable expense identification
 * 
 * @param params - Hook parameters
 * @param params.formData - The complete form data with all activity values and payment statuses
 * @param params.openingBalance - The opening cash balance for the current quarter (DEPRECATED: use previousQuarterBalances)
 * @param params.activities - The activities schema defining all sections and activities
 * @param params.quarter - The current quarter being calculated (Q1, Q2, Q3, or Q4)
 * @param params.otherReceivableAmount - Amount from Section X Miscellaneous Adjustments (defaults to 0)
 * @param params.previousQuarterBalances - Previous quarter closing balances for rollover (NEW)
 * @returns Calculated financial values including cash at bank, payables, and VAT receivables
 */
export function useExpenseCalculations({
  formData,
  openingBalance,
  activities,
  quarter,
  otherReceivableAmount = 0,  // Default to 0 for backward compatibility
  previousQuarterBalances,  // NEW: Previous quarter closing balances
}: UseExpenseCalculationsParams): UseExpenseCalculationsReturn {
  // Generate expense-to-payable mapping from activities (memoized)
  const expenseToPayableMapping = useMemo(() => {
    const mapping = generateExpenseToPayableMapping(activities);
    return mapping;
  }, [activities]);

  // Memoize VAT-applicable expense identification
  const vatApplicableExpenses = useMemo(() => {
    if (!activities?.B?.subCategories) {
      return new Map<string, { isVAT: boolean; category: VATApplicableCategory | null; name: string }>();
    }

    const vatMap = new Map<string, { isVAT: boolean; category: VATApplicableCategory | null; name: string }>();

    Object.values(activities.B.subCategories).forEach((subCatData: any) => {
      const items = subCatData.items || [];
      items.forEach((item: any) => {
        if (item.isTotalRow || item.isComputed) return;
        
        const isVAT = isVATApplicable(item.code, item.name);
        const category = isVAT ? getVATCategory(item.name) : null;
        
        vatMap.set(item.code, {
          isVAT,
          category,
          name: item.name,
        });
      });
    });

    return vatMap;
  }, [activities]);

  // Extract effective opening balance from previous quarter or fallback to parameter
  // Requirements: 4.1, 4.2, 4.4, 9.1
  const effectiveOpeningBalance = useMemo(() => {
    if (previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.D) {
      // Find Cash at Bank activity code in Section D
      // Cash at Bank is D_1 (first item in Section D)
      // Format: {PROJECT}_EXEC_{FACILITY}_D_1
      const cashAtBankCode = Object.keys(previousQuarterBalances.closingBalances.D).find(code => 
        code.includes('_D_1')
      );
      
      const cashBalance = cashAtBankCode 
        ? previousQuarterBalances.closingBalances.D[cashAtBankCode] 
        : 0;

      return cashBalance;
    }

    // Fallback to openingBalance parameter for backward compatibility
    return openingBalance;
  }, [previousQuarterBalances, openingBalance, quarter]);

  // Extract previous quarter payables for rollover
  // Requirements: 4.5, 9.5
  const previousQuarterPayables = useMemo(() => {
    if (previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.E) {
      const payables: Record<string, number> = {};
      
      // Extract all Section E (payables) closing balances
      Object.entries(previousQuarterBalances.closingBalances.E).forEach(([code, amount]) => {
        if (amount > 0) {
          payables[code] = amount;
        }
      });

      return payables;
    }

    return {};
  }, [previousQuarterBalances]);

  // Extract previous quarter VAT receivables for rollover
  // Requirements: VAT quarterly continuity
  const previousQuarterVATReceivables = useMemo(() => {
    if (!previousQuarterBalances?.exists) {
      return {};
    }

    const vatReceivables: Record<string, number> = {};

    const closingVAT = previousQuarterBalances.closingBalances?.VAT;
    if (closingVAT && Object.keys(closingVAT).length > 0) {
      Object.entries(closingVAT).forEach(([category, amount]) => {
        if (amount > 0) {
          vatReceivables[category] = amount;
        }
      });

      return vatReceivables;
    }

    const closingD = previousQuarterBalances.closingBalances?.D;
    if (closingD) {
      Object.entries(closingD).forEach(([code, amount]) => {
        if (amount > 0) {
          const category = getVATCategoryFromCode(code);
          if (category) {
            vatReceivables[category] = (vatReceivables[category] || 0) + amount;
          }
        }
      });
    }

    return vatReceivables;
  }, [previousQuarterBalances]);

  // Calculate all financial values
  const calculations = useMemo(() => {
    // Get Section B expenses
    const sectionB = activities?.B;
    if (!sectionB?.subCategories) {
      return {
        cashAtBank: effectiveOpeningBalance,
        payables: previousQuarterPayables,
        vatReceivables: previousQuarterVATReceivables,
        totalExpenses: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        totalVATReceivable: 0,
        totalVATCleared: 0,
      };
    }

    // Extract all expense items from Section B
    const expenseItems: Array<{
      code: string;
      name: string;
      amount: number;
      amountPaid: number;
      payableCode: string | null;
      isVATApplicable: boolean;
      netAmount: number;
      vatAmount: number;
      vatCleared: number;
      vatCategory: VATApplicableCategory | null;
    }> = [];

    Object.entries(sectionB.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
      const items = subCatData.items || [];

      items.forEach((item: any) => {
        if (item.isTotalRow || item.isComputed) {
          return;
        }

        const expenseCode = item.code;
        const expenseData = formData[expenseCode];

        if (!expenseData) {
          return;
        }

        // Get the amount for the current quarter
        const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
        const amount = Number(expenseData[quarterKey]) || 0;

        // Use memoized VAT-applicable expense identification
        const vatInfo = vatApplicableExpenses.get(expenseCode);
        const isVAT = vatInfo?.isVAT || false;
        const vatCategory = vatInfo?.category || null;

        // Get VAT-specific data (only for VAT-applicable expenses)
        const netAmount = isVAT 
          ? (Number(expenseData.netAmount?.[quarterKey]) || 0)
          : amount;
        const vatAmount = isVAT
          ? (Number(expenseData.vatAmount?.[quarterKey]) || 0)
          : 0;
        const vatCleared = isVAT
          ? (Number(expenseData.vatCleared?.[quarterKey]) || 0)
          : 0;

        // 🐛 DEBUG: Expense VAT Data Extraction
        if (isVAT && (vatAmount > 0 || vatCleared > 0)) {
          console.log(`💸 [EXPENSE VAT] ${item.name}`, {
            expenseCode,
            quarter,
            quarterKey,
            vatCategory,
            netAmount,
            vatAmount,
            vatCleared,
            expenseDataRaw: {
              netAmount: expenseData.netAmount,
              vatAmount: expenseData.vatAmount,
              vatCleared: expenseData.vatCleared
            }
          });
        }

        // Get quarter-specific payment status (support both old and new format)
        const paymentStatusData = expenseData.paymentStatus;
        const amountPaidData = expenseData.amountPaid;
        
        const paymentStatus = amount > 0
          ? (typeof paymentStatusData === 'object' && paymentStatusData !== null
              ? (paymentStatusData[quarterKey] || 'unpaid')
              : (paymentStatusData || 'unpaid'))
          : 'unpaid';
        
        let amountPaid = 0;

        if (amount > 0) {
          if (paymentStatus === 'paid') {
            // For VAT-applicable expenses, amountPaid represents total invoice (net + VAT)
            // Use full invoice amount for proper cash and payable calculations
            amountPaid = isVAT ? (netAmount + vatAmount) : amount;
          } else if (paymentStatus === 'partial') {
            const totalPaidFromForm = typeof amountPaidData === 'object' && amountPaidData !== null
              ? (Number(amountPaidData[quarterKey]) || 0)
              : (Number(amountPaidData) || 0);
            
            // For VAT-applicable expenses, use the full partial payment amount
            // This ensures proper cash and payable calculations
            amountPaid = totalPaidFromForm;
          }
        }

        // Get the corresponding payable code
        const payableCode = expenseToPayableMapping[expenseCode] || null;

        expenseItems.push({
          code: expenseCode,
          name: item.name,
          amount,
          amountPaid,
          payableCode,
          isVATApplicable: isVAT,
          netAmount,
          vatAmount,
          vatCleared,
          vatCategory,
        });
      });
    });

    // Calculate receipts from Section A
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    let totalReceipts = 0;
    
    // Sum all Section A (Receipts) activities for the current quarter
    // Exclude total rows to avoid double-counting
    const sectionA = activities?.A;
    if (sectionA?.items) {
      sectionA.items.forEach((item: any) => {
        if (!item.isTotalRow && !item.isComputed) {
          const amount = Number(formData[item.code]?.[quarterKey]) || 0;
          totalReceipts += amount;
        }
      });
    }

    // Calculate totals
    // For VAT-applicable expenses, use net amount (excluding VAT)
    // For non-VAT expenses, use the full amount
    const totalExpenses = expenseItems.reduce((sum, item) => 
      sum + (item.isVATApplicable ? item.netAmount : item.amount), 0
    );
    const totalPaid = expenseItems.reduce((sum, item) => sum + item.amountPaid, 0);
    const totalUnpaid = totalExpenses - totalPaid;
    
    // Calculate VAT totals
    const totalVATReceivable = expenseItems.reduce((sum, item) => 
      sum + (item.isVATApplicable ? item.vatAmount : 0), 0
    );
    const totalVATCleared = expenseItems.reduce((sum, item) => 
      sum + (item.isVATApplicable ? item.vatCleared : 0), 0
    );

    // Calculate total payable clearances (payments made to clear liabilities)
    // When payables are paid, cash decreases
    let totalPayableCleared = 0;
    Object.keys(formData).forEach((code) => {
      if (code.includes('_E_')) {
        const payableData = formData[code];
        if (payableData?.payableCleared) {
          const clearedAmount = Number(payableData.payableCleared[quarterKey]) || 0;
          if (clearedAmount > 0) {
            totalPayableCleared += clearedAmount;
          }
        }
      }
    });

    // Calculate Cash at Bank using double-entry accounting principles with quarterly rollover:
    // 
    // Cash at Bank = Opening Balance + Receipts - Total Paid + Total VAT Cleared - Other Receivable - Total Payable Cleared
    // 
    // Breakdown:
    // 1. Start with Opening Balance (from previous quarter closing or parameter)
    // 2. Add Total Receipts (cash inflows from Section A)
    // 3. Subtract Total Paid (cash outflows for expenses paid directly)
    // 4. Add Total VAT Cleared (cash inflows from VAT refunds)
    // 5. Subtract Other Receivable (cash reduction when recording miscellaneous receivables)
    // 6. Subtract Total Payable Cleared (cash outflows when paying liabilities)
    //
    // The Other Receivable adjustment ensures proper double-entry accounting:
    // - When a receivable is recorded in Section X, it increases Other Receivables (asset)
    // - The same amount must decrease Cash at Bank (asset) to maintain balance
    // - Net effect on Total Financial Assets = 0 (as required by accounting principles)
    //
    // The Payable Cleared adjustment ensures proper liability payment accounting:
    // - When a payable is paid, it decreases Payables (liability) in Section E
    // - The same amount must decrease Cash at Bank (asset) in Section D
    // - Accounting entry: Dr Payable, Cr Cash
    //
    // Requirements: 4.4, 9.1, 9.2
    const cashAtBank = effectiveOpeningBalance + totalReceipts - totalPaid + totalVATCleared - otherReceivableAmount - totalPayableCleared;

    // Calculate payables by category with quarterly rollover
    // Start with previous quarter's unpaid payables, then add current quarter's unpaid expenses
    // Then subtract any payable clearances (payments made to clear liabilities)
    // Requirements: 4.5, 9.5
    const payables: Record<string, number> = { ...previousQuarterPayables };

    expenseItems.forEach((item) => {
      // For VAT-applicable expenses, use full invoice amount (net + VAT) for payables
      // For non-VAT expenses, use the regular amount
      const unpaidAmount = item.isVATApplicable 
        ? (item.netAmount + item.vatAmount) - item.amountPaid
        : item.amount - item.amountPaid;

      // Only add to payables if there's an unpaid amount and a valid payable code
      if (unpaidAmount > 0 && item.payableCode) {
        const previousBalance = payables[item.payableCode] || 0;
        payables[item.payableCode] = previousBalance + unpaidAmount;
      }
    });

    // Subtract payable clearances (payments made to clear liabilities)
    // When a payable is paid, it reduces the payable balance
    Object.keys(payables).forEach((payableCode) => {
      const payableData = formData[payableCode];

      if (payableData?.payableCleared) {
        const clearedAmount = Number(payableData.payableCleared[quarterKey]) || 0;
        if (clearedAmount > 0) {
          payables[payableCode] = Math.max(0, payables[payableCode] - clearedAmount);
        }
      }
    });

    // Calculate VAT receivables by category with quarterly rollover
    // Start with previous quarter's uncleared VAT receivables, then add current quarter's VAT receivables
    // Requirements: VAT quarterly continuity

    // Track current-quarter VAT incurred and cleared by category
    const vatIncurredByCategory: Record<string, number> = {};
    const vatClearedByCategory: Record<string, number> = {};

    expenseItems.forEach((item) => {
      if (item.isVATApplicable && item.vatCategory) {
        const category = item.vatCategory;

        if (item.vatAmount > 0) {
          vatIncurredByCategory[category] = (vatIncurredByCategory[category] || 0) + item.vatAmount;
        }

        if (item.vatCleared > 0) {
          vatClearedByCategory[category] = (vatClearedByCategory[category] || 0) + item.vatCleared;
        }
      }
    });

    // Apply formula per category: closing = opening + incurred - cleared
    const vatReceivables: Record<string, number> = {};

    const allCategories = new Set<string>([ 
      ...Object.keys(previousQuarterVATReceivables),
      ...Object.keys(vatIncurredByCategory),
      ...Object.keys(vatClearedByCategory),
    ]);

    allCategories.forEach((category) => {
      const opening = previousQuarterVATReceivables[category] || 0;
      const incurred = vatIncurredByCategory[category] || 0;
      const cleared = vatClearedByCategory[category] || 0;
      const closing = Math.max(0, opening + incurred - cleared);

      // 🐛 DEBUG: VAT Receivable Calculation
      console.log(`🧮 [VAT CALC] Category: ${category}`, {
        quarter,
        opening,
        incurred,
        cleared,
        calculation: `${opening} + ${incurred} - ${cleared} = ${closing}`,
        closing,
        willBeStored: closing > 0
      });

      if (closing > 0) {
        vatReceivables[category] = closing;
      }
    });

    // 🐛 DEBUG: Final VAT Receivables Summary
    console.log(`📊 [VAT SUMMARY] Quarter: ${quarter}`, {
      quarter,
      previousQuarterVATReceivables,
      vatIncurredByCategory,
      vatClearedByCategory,
      finalVATReceivables: vatReceivables,
      totalVATReceivable,
      totalVATCleared
    });

    return {
      cashAtBank,
      payables,
      vatReceivables,
      totalExpenses,
      totalPaid,
      totalUnpaid,
      totalVATReceivable,
      totalVATCleared,
    };
  }, [
    formData, 
    openingBalance, 
    activities, 
    quarter, 
    otherReceivableAmount, 
    expenseToPayableMapping, 
    vatApplicableExpenses,
    effectiveOpeningBalance,
    previousQuarterPayables,
    previousQuarterVATReceivables,
    previousQuarterBalances,
  ]);

  return calculations;
}
