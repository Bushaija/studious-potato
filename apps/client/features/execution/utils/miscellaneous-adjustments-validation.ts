/**
 * Validation utilities for miscellaneous adjustments (Section X)
 * 
 * ## Purpose
 * This module provides validation functions to ensure that Other Receivable entries
 * in Section X follow proper accounting rules and don't create invalid financial states.
 * 
 * ## Double-Entry Accounting Context
 * When an accountant enters an Other Receivable amount in Section X:
 * 1. Other Receivables (Section D) increases by the amount (asset increase)
 * 2. Cash at Bank (Section D) decreases by the amount (asset decrease)
 * 3. Net effect on Total Financial Assets = 0 (proper double-entry)
 * 
 * ## Validation Rules
 * To maintain accounting integrity, we validate that:
 * - The amount is non-negative (no negative receivables)
 * - The amount doesn't exceed available Cash at Bank (prevents negative cash balance)
 * - The input is numeric (data type validation)
 * 
 * ## Requirements Mapping
 * - Requirement 6.1: Validate sufficient cash (prevent negative Cash at Bank)
 * - Requirement 6.2: Prevent form submission with invalid amounts
 * - Requirement 6.3: Accept only non-negative numeric values
 * - Requirement 6.4: Display validation error messages
 * - Requirement 6.5: Display maximum allowable amount
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  maxAllowableAmount?: number;
}

/**
 * Validates a miscellaneous adjustment (Other Receivable) entry
 * 
 * Validation rules:
 * 1. Amount must be numeric (handled by caller - this function expects a number)
 * 2. Amount must be non-negative (>= 0)
 * 3. Amount cannot exceed available Cash at Bank (to prevent negative cash balance)
 * 
 * @param otherReceivableAmount - The amount entered for Other Receivable
 * @param cashAtBankBeforeAdjustment - The Cash at Bank balance before applying the adjustment
 * @returns ValidationResult with isValid flag, optional error message, and max allowable amount
 * 
 * @example
 * ```typescript
 * const result = validateMiscellaneousAdjustments(50000, 100000);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateMiscellaneousAdjustments(
  otherReceivableAmount: number,
  cashAtBankBeforeAdjustment: number
): ValidationResult {
  // Validate that the amount is a valid number
  if (isNaN(otherReceivableAmount) || !isFinite(otherReceivableAmount)) {
    return {
      isValid: false,
      error: 'Other Receivable amount must be a valid number',
      maxAllowableAmount: Math.max(0, cashAtBankBeforeAdjustment),
    };
  }

  // Validate non-negative value (Requirement 6.3)
  if (otherReceivableAmount < 0) {
    return {
      isValid: false,
      error: 'Other Receivable amount cannot be negative',
      maxAllowableAmount: Math.max(0, cashAtBankBeforeAdjustment),
    };
  }

  // Validate sufficient cash (Requirement 6.1, 6.2)
  // The adjustment will reduce Cash at Bank, so we need to ensure it doesn't go negative
  if (otherReceivableAmount > cashAtBankBeforeAdjustment) {
    const formattedAmount = otherReceivableAmount.toLocaleString();
    const formattedCash = cashAtBankBeforeAdjustment.toLocaleString();
    
    return {
      isValid: false,
      error: `Other Receivable amount (${formattedAmount} RWF) exceeds available Cash at Bank (${formattedCash} RWF)`,
      maxAllowableAmount: Math.max(0, cashAtBankBeforeAdjustment),
    };
  }

  // All validations passed
  return {
    isValid: true,
    maxAllowableAmount: Math.max(0, cashAtBankBeforeAdjustment),
  };
}

/**
 * Validates numeric input for Other Receivable field
 * 
 * This function checks if a string input can be converted to a valid number
 * for use in the Other Receivable field.
 * 
 * @param input - The string input from the user
 * @returns ValidationResult with isValid flag and optional error message
 * 
 * @example
 * ```typescript
 * const result = validateNumericInput("50000");
 * if (result.isValid) {
 *   const amount = parseFloat(input);
 * }
 * ```
 */
export function validateNumericInput(input: string): ValidationResult {
  // Empty input is valid (treated as 0)
  if (input === '' || input === null || input === undefined) {
    return { isValid: true };
  }

  // Check if input can be converted to a number
  const numValue = parseFloat(input);
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      isValid: false,
      error: 'Please enter a valid numeric value',
    };
  }

  // Check for negative values
  if (numValue < 0) {
    return {
      isValid: false,
      error: 'Other Receivable amount cannot be negative',
    };
  }

  return { isValid: true };
}

/**
 * Gets the maximum allowable Other Receivable amount
 * 
 * The maximum amount is equal to the current Cash at Bank balance,
 * since the adjustment will reduce Cash at Bank by the same amount.
 * 
 * @param cashAtBankBeforeAdjustment - The Cash at Bank balance before applying the adjustment
 * @returns The maximum allowable amount (cannot be negative)
 */
export function getMaxAllowableAmount(cashAtBankBeforeAdjustment: number): number {
  return Math.max(0, cashAtBankBeforeAdjustment);
}
