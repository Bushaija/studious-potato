import { useMemo } from 'react';

/**
 * Activity quarter values interface
 */
export interface ActivityQuarterValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  paymentStatus?: any;
  amountPaid?: any;
  netAmount?: Record<string, number>;
  vatAmount?: Record<string, number>;
  vatCleared?: Record<string, number>;
}

/**
 * Parameters for the miscellaneous adjustments hook
 */
export interface UseMiscellaneousAdjustmentsParams {
  formData: Record<string, ActivityQuarterValues>;
  activities: any;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

/**
 * Return value from the miscellaneous adjustments hook
 */
export interface UseMiscellaneousAdjustmentsReturn {
  otherReceivableAmount: number;
  otherReceivableCode: string | null;
}

/**
 * Custom hook to extract Other Receivable amount from Section X (Miscellaneous Adjustments)
 * 
 * ## Purpose
 * This hook implements the frontend logic for double-entry accounting of miscellaneous receivables.
 * It extracts the Other Receivable amount entered by the accountant in Section X and makes it
 * available for automatic calculations in Section D.
 * 
 * ## Double-Entry Accounting Logic
 * When an accountant enters an Other Receivable amount in Section X:
 * 1. The amount is extracted by this hook
 * 2. It's used to increase "Other Receivables" in Section D (asset increase)
 * 3. It's used to decrease "Cash at Bank" in Section D (asset decrease)
 * 4. Net effect on Total Financial Assets = 0 (proper double-entry)
 * 
 * ## Implementation Details
 * - Finds the "Other Receivable" activity in Section X by looking for activityType 'MISCELLANEOUS_ADJUSTMENT'
 * - Extracts the amount for the current quarter only
 * - Returns both the amount and the activity code for reference
 * - Uses useMemo for performance optimization to avoid unnecessary recalculations
 * 
 * ## Data Flow
 * Section X Input → useMiscellaneousAdjustments → useExpenseCalculations → Section D Display
 * 
 * @param params - Hook parameters containing form data, activities schema, and current quarter
 * @param params.formData - The complete form data with all activity values
 * @param params.activities - The activities schema defining all sections and activities
 * @param params.quarter - The current quarter being edited (Q1, Q2, Q3, or Q4)
 * @returns Object containing the Other Receivable amount and its activity code
 */
export function useMiscellaneousAdjustments({
  formData,
  activities,
  quarter,
}: UseMiscellaneousAdjustmentsParams): UseMiscellaneousAdjustmentsReturn {
  return useMemo(() => {
    // Find Section X "Other Receivable" activity
    const sectionX = activities?.X;
    if (!sectionX?.items) {
      return { otherReceivableAmount: 0, otherReceivableCode: null };
    }

    const otherReceivableActivity = sectionX.items.find(
      (item: any) => item.activityType === 'MISCELLANEOUS_ADJUSTMENT'
    );

    if (!otherReceivableActivity) {
      return { otherReceivableAmount: 0, otherReceivableCode: null };
    }

    const activityCode = otherReceivableActivity.code;
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    const amount = Number(formData[activityCode]?.[quarterKey]) || 0;

    return {
      otherReceivableAmount: amount,
      otherReceivableCode: activityCode,
    };
  }, [formData, activities, quarter]);
}
