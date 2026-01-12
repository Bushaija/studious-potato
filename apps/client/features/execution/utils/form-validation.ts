/**
 * Form Validation Utilities for Execution Forms
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Check if an activity code represents an opening balance field
 * Opening balance fields should not be manually editable
 * 
 * Requirements: 11.1
 * 
 * NOTE: Opening balances are NOT in Section A (Receipts).
 * Opening balances are the starting values for Section D (Financial Assets) and Section E (Financial Liabilities).
 * These are automatically calculated from the previous quarter's closing balances.
 */
export function isOpeningBalanceField(activityCode: string, activityName?: string): boolean {
  // Opening balances are in Section D and E, not Section A
  // Section D and E opening balances are auto-calculated from previous quarter closing balances
  // They are not separate fields - they are the starting values for the quarter
  
  // Check by name for explicit opening balance fields
  if (activityName) {
    const nameLower = activityName.toLowerCase();
    if (nameLower.includes('opening balance') || nameLower.includes('opening cash')) {
      return true;
    }
  }
  
  // No activity codes should be marked as opening balance fields
  // Opening balances are calculated, not stored as separate activities
  return false;
}

/**
 * Validate that a value is not negative for receipts, expenditures, assets, or liabilities
 * 
 * Requirements: 11.2
 */
export function validateNonNegative(
  activityCode: string,
  value: number,
  activityName?: string
): ValidationError | null {
  if (value < 0) {
    return {
      field: activityCode,
      message: `${activityName || activityCode} cannot be negative. Please enter a positive value or zero.`,
      type: 'error',
    };
  }
  return null;
}

/**
 * Validate that payment amount does not exceed the incurred expense amount
 * 
 * Requirements: 11.3
 */
export function validatePaymentAmount(
  activityCode: string,
  expenseAmount: number,
  paymentAmount: number,
  activityName?: string
): ValidationError | null {
  if (paymentAmount > expenseAmount) {
    return {
      field: activityCode,
      message: `Payment amount (${paymentAmount.toFixed(2)}) cannot exceed expense amount (${expenseAmount.toFixed(2)}) for ${activityName || activityCode}.`,
      type: 'error',
    };
  }
  return null;
}

/**
 * Validate that VAT cleared amount does not exceed VAT receivable amount
 * 
 * Requirements: 11.4
 */
export function validateVATCleared(
  activityCode: string,
  vatReceivable: number,
  vatCleared: number,
  activityName?: string
): ValidationError | null {
  if (vatCleared > vatReceivable) {
    return {
      field: activityCode,
      message: `VAT cleared amount (${vatCleared.toFixed(2)}) cannot exceed VAT receivable amount (${vatReceivable.toFixed(2)}) for ${activityName || activityCode}.`,
      type: 'error',
    };
  }
  return null;
}

/**
 * Validate all form data for a specific quarter
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function validateFormData(
  formData: Record<string, any>,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  activities: any,
  plannedBudget?: number | null
): ValidationResult {
  const errors: ValidationError[] = [];
  const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

  // Get activity metadata for better error messages
  const activityMetadata = new Map<string, { name: string; section: string }>();
  
  if (activities) {
    Object.entries(activities).forEach(([sectionCode, sectionData]: [string, any]) => {
      // Handle sections with direct items
      if (sectionData.items) {
        sectionData.items.forEach((item: any) => {
          activityMetadata.set(item.code, {
            name: item.name,
            section: sectionCode,
          });
        });
      }
      
      // Handle sections with subcategories
      if (sectionData.subCategories) {
        Object.values(sectionData.subCategories).forEach((subCategory: any) => {
          if (subCategory.items) {
            subCategory.items.forEach((item: any) => {
              activityMetadata.set(item.code, {
                name: item.name,
                section: sectionCode,
              });
            });
          }
        });
      }
    });
  }

  // Validate each activity
  Object.entries(formData).forEach(([activityCode, activityData]) => {
    // Skip if activityData is not an object or is null
    if (!activityData || typeof activityData !== 'object') {
      return;
    }
    
    const metadata = activityMetadata.get(activityCode);
    const activityName = metadata?.name;
    const value = Number(activityData[quarterKey]) || 0;

    // Skip validation for zero values (no data entered)
    if (value === 0 && !activityData.paymentStatus && !activityData.vatCleared) {
      return;
    }

    // Validate non-negative values (Requirement 11.2)
    const negativeError = validateNonNegative(activityCode, value, activityName);
    if (negativeError) {
      errors.push(negativeError);
    }

    // Validate payment amounts (Requirement 11.3)
    if (activityData.paymentStatus) {
      const paymentStatus = typeof activityData.paymentStatus === 'object'
        ? activityData.paymentStatus[quarterKey]
        : activityData.paymentStatus;
      
      if (paymentStatus === 'paid' || paymentStatus === 'partial') {
        const amountPaid = typeof activityData.amountPaid === 'object'
          ? (Number(activityData.amountPaid[quarterKey]) || 0)
          : (Number(activityData.amountPaid) || 0);
        
        const paymentError = validatePaymentAmount(
          activityCode,
          value,
          amountPaid,
          activityName
        );
        if (paymentError) {
          errors.push(paymentError);
        }
      }
    }

    // Validate VAT cleared amounts (Requirement 11.4)
    // CRITICAL FIX: VAT cleared validation should check against the TOTAL VAT RECEIVABLE BALANCE,
    // not just the VAT incurred in the current quarter.
    // 
    // For Section B expenses with VAT:
    // - vatAmount = VAT incurred in current quarter
    // - vatCleared = VAT refund received in current quarter
    // - The total receivable = opening balance + vatAmount - vatCleared
    // 
    // Validation should ensure: vatCleared <= (opening balance + vatAmount)
    // But we don't have direct access to opening balance here, so we skip validation
    // for Section B and rely on the auto-calculated Section D VAT receivables to show
    // if the balance goes negative (which would trigger the non-negative validation)
    if (activityData.vatCleared) {
      const vatCleared = Number(activityData.vatCleared[quarterKey]) || 0;
      
      // Only validate if there's actually VAT cleared
      if (vatCleared > 0) {
        // Check if this is a Section D VAT receivable activity
        const isVATReceivable = activityCode.includes('_D_') && 
          (activityCode.includes('VAT') || activityName?.toLowerCase().includes('vat receivable'));
        
        if (isVATReceivable) {
          // For Section D VAT receivables, validate against the current quarter value
          // which represents the closing balance (opening + incurred - cleared)
          // If cleared > (opening + incurred), the closing balance would be negative
          // which is caught by the non-negative validation
          
          // We can validate by checking if the closing balance would be negative
          const closingBalance = Number(activityData[quarterKey]) || 0;
          
          // If closing balance is negative, it means cleared exceeded available balance
          if (closingBalance < 0) {
            errors.push({
              field: activityCode,
              message: `VAT cleared amount (${vatCleared.toFixed(2)}) exceeds available VAT receivable balance for ${activityName || activityCode}. Closing balance cannot be negative.`,
              type: 'error',
            });
          }
        }
        // For Section B expenses, we don't validate here because:
        // 1. We don't have access to the opening balance
        // 2. The validation is done on the corresponding Section D VAT receivable
        // 3. If cleared > available, Section D will show negative balance (caught by non-negative validation)
      }
    }
  });

  // Validate total expenditures against planned budget (Requirement: Budget compliance)
  // Calculate total expenditures for Section B (Expenditures)
  let totalExpenditures = 0;
  
  Object.entries(formData).forEach(([activityCode, activityData]) => {
    if (!activityData || typeof activityData !== 'object') return;
    
    const metadata = activityMetadata.get(activityCode);
    // Only count Section B (Expenditures)
    if (metadata?.section === 'B') {
      const value = Number(activityData[quarterKey]) || 0;
      totalExpenditures += value;
    }
  });


  if (plannedBudget !== undefined && plannedBudget !== null && plannedBudget > 0) {
    if (totalExpenditures > plannedBudget) {
      errors.push({
        field: 'total_expenditures',
        message: `Total expenditures (${totalExpenditures.toFixed(2)}) exceed the planned budget (${plannedBudget.toFixed(2)}). Please adjust your expenses to stay within budget.`,
        type: 'error',
      });
    }
  } else if (totalExpenditures > 0) {
    // Warning: No planned budget found
    console.warn('⚠️ [Budget Validation] No planned budget found for this facility/period. Expenditures cannot be validated against budget.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get a user-friendly error message for a specific field
 * 
 * Requirements: 11.5
 */
export function getFieldErrorMessage(
  errors: ValidationError[],
  activityCode: string
): string | null {
  const error = errors.find(e => e.field === activityCode);
  return error ? error.message : null;
}

/**
 * Check if a field has validation errors
 */
export function hasFieldError(
  errors: ValidationError[],
  activityCode: string
): boolean {
  return errors.some(e => e.field === activityCode);
}
