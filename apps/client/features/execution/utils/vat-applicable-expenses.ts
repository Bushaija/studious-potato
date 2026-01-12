/**
 * VAT-Applicable Expense Identification Utility
 * 
 * This utility identifies which expenses generate VAT receivables.
 * Four expense categories generate VAT receivables because their VAT is recoverable
 * from RRA (Rwanda Revenue Authority) through MICOFEN:
 * - Communication - Airtime
 * - Communication - Internet
 * - Infrastructure Support
 * - Office Supplies
 */

export const VAT_APPLICABLE_CATEGORIES = {
  AIRTIME: 'airtime',
  INTERNET: 'internet',
  INFRASTRUCTURE: 'infrastructure',
  OFFICE_SUPPLIES: 'office_supplies',
} as const;

export type VATApplicableCategory = typeof VAT_APPLICABLE_CATEGORIES[keyof typeof VAT_APPLICABLE_CATEGORIES];

/**
 * Determines if an expense code represents a VAT-applicable expense
 * 
 * @param expenseCode - The activity code (e.g., "HIV_EXEC_HOSPITAL_B_B-04_1")
 * @param activityName - The activity name (e.g., "Communication - Airtime")
 * @returns true if the expense generates VAT receivables
 * 
 * @example
 * ```typescript
 * isVATApplicable("HIV_EXEC_HOSPITAL_B_B-04_1", "Communication - Airtime") // true
 * isVATApplicable("HIV_EXEC_HOSPITAL_B_B-01_1", "Salaries") // false
 * ```
 */
export function isVATApplicable(expenseCode: string, activityName: string): boolean {
  const nameLower = activityName.toLowerCase();
  
  return (
    (nameLower.includes('communication') && nameLower.includes('airtime')) ||
    (nameLower.includes('communication') && nameLower.includes('internet')) ||
    nameLower.includes('infrastructure support') ||
    nameLower.includes('office supplies')
  );
}

/**
 * Gets the VAT category for a VAT-applicable expense
 * 
 * @param activityName - The activity name
 * @returns The VAT category identifier or null if not VAT-applicable
 * 
 * @example
 * ```typescript
 * getVATCategory("Communication - Airtime") // "airtime"
 * getVATCategory("Infrastructure Support") // "infrastructure"
 * getVATCategory("Salaries") // null
 * ```
 */
export function getVATCategory(activityName: string): VATApplicableCategory | null {
  const nameLower = activityName.toLowerCase();
  
  if (nameLower.includes('airtime')) return VAT_APPLICABLE_CATEGORIES.AIRTIME;
  if (nameLower.includes('internet')) return VAT_APPLICABLE_CATEGORIES.INTERNET;
  if (nameLower.includes('infrastructure')) return VAT_APPLICABLE_CATEGORIES.INFRASTRUCTURE;
  if (nameLower.includes('office supplies')) return VAT_APPLICABLE_CATEGORIES.OFFICE_SUPPLIES;
  
  return null;
}
