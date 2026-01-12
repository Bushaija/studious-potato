/**
 * VAT-Applicable Expense Identification Utility
 * 
 * This utility identifies which expenses generate VAT receivables.
 * Four expense categories generate VAT receivables because their VAT is recoverable
 * from RRA (Rwanda Revenue Authority) through MICOFEN:
 * - Communication - All
 * - Maintenance for vehicles, ICT, and medical equipments
 * - Fuel
 * - Office Supplies
 */

export const VAT_APPLICABLE_CATEGORIES = {
  COMMUNICATION_ALL: 'communication_all',
  MAINTENANCE: 'maintenance',
  FUEL: 'fuel',
  OFFICE_SUPPLIES: 'office_supplies',
} as const;

export type VATApplicableCategory = typeof VAT_APPLICABLE_CATEGORIES[keyof typeof VAT_APPLICABLE_CATEGORIES];

/**
 * Determines if an expense code represents a VAT-applicable expense
 * 
 * @param expenseCode - The activity code (e.g., "HIV_EXEC_HOSPITAL_B_B-04_1")
 * @param activityName - The activity name (e.g., "Communication - All")
 * @returns true if the expense generates VAT receivables
 * 
 * @example
 * ```typescript
 * isVATApplicable("HIV_EXEC_HOSPITAL_B_B-04_1", "Communication - All") // true
 * isVATApplicable("HIV_EXEC_HOSPITAL_B_B-01_1", "Salaries") // false
 * ```
 */
export function isVATApplicable(expenseCode: string, activityName: string): boolean {
  const nameLower = activityName.toLowerCase();
  
  return (
    nameLower.includes('communication - all') ||
    nameLower.includes('communication-all') ||
    (nameLower.includes('communication') && nameLower.includes('all')) ||
    nameLower.includes('maintenance for vehicles') ||
    nameLower.includes('maintenance') ||
    nameLower === 'fuel' ||
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
 * getVATCategory("Communication - All") // "communication_all"
 * getVATCategory("Maintenance for vehicles, ICT, and medical equipments") // "maintenance"
 * getVATCategory("Fuel") // "fuel"
 * getVATCategory("Office supplies") // "office_supplies"
 * getVATCategory("Salaries") // null
 * ```
 */
export function getVATCategory(activityName: string): VATApplicableCategory | null {
  const nameLower = activityName.toLowerCase();
  
  if (nameLower.includes('communication') && nameLower.includes('all')) return VAT_APPLICABLE_CATEGORIES.COMMUNICATION_ALL;
  if (nameLower.includes('maintenance')) return VAT_APPLICABLE_CATEGORIES.MAINTENANCE;
  if (nameLower === 'fuel' || nameLower.includes('fuel')) return VAT_APPLICABLE_CATEGORIES.FUEL;
  if (nameLower.includes('office supplies')) return VAT_APPLICABLE_CATEGORIES.OFFICE_SUPPLIES;
  
  return null;
}
