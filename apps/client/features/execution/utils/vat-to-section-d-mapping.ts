/**
 * VAT-to-Section-D Mapping Utility
 * 
 * This utility maps VAT categories to their corresponding Section D line item codes.
 * These line items represent VAT receivables (assets) that will be refunded by RRA through MICOFEN.
 * 
 * UPDATED: VAT receivables are now classified in Section D (Financial Assets) instead of Section E,
 * as they represent amounts owed TO the facility by RRA, making them assets rather than liabilities.
 */

import { VAT_APPLICABLE_CATEGORIES, type VATApplicableCategory } from './vat-applicable-expenses';

/**
 * Maps VAT categories to their corresponding Section D line item codes
 * These line items represent VAT receivables (assets) in the execution schema
 * 
 * @param projectType - The project type (HIV, MAL, TB)
 * @param facilityType - The facility type (hospital, health_center)
 * @param vatCategory - The VAT category
 * @returns The Section D line item code for the VAT receivable
 * 
 * @example
 * ```typescript
 * getVATReceivableCode('HIV', 'hospital', 'airtime')
 * // Returns: "HIV_EXEC_HOSPITAL_D_VAT_AIRTIME"
 * 
 * getVATReceivableCode('MAL', 'health_center', 'internet')
 * // Returns: "MAL_EXEC_HEALTH_CENTER_D_VAT_INTERNET"
 * ```
 */
export function getVATReceivableCode(
  projectType: 'HIV' | 'MAL' | 'TB',
  facilityType: 'hospital' | 'health_center',
  vatCategory: VATApplicableCategory
): string {
  const prefix = `${projectType}_EXEC_${facilityType.toUpperCase()}`;
  
  // Map VAT categories to Section D codes (Financial Assets)
  // These codes should be added to the dynamic_activities table
  const vatCodeMap: Record<VATApplicableCategory, string> = {
    [VAT_APPLICABLE_CATEGORIES.AIRTIME]: `${prefix}_D_VAT_AIRTIME`,
    [VAT_APPLICABLE_CATEGORIES.INTERNET]: `${prefix}_D_VAT_INTERNET`,
    [VAT_APPLICABLE_CATEGORIES.INFRASTRUCTURE]: `${prefix}_D_VAT_INFRASTRUCTURE`,
    [VAT_APPLICABLE_CATEGORIES.OFFICE_SUPPLIES]: `${prefix}_D_VAT_SUPPLIES`,
  };
  
  return vatCodeMap[vatCategory];
}

/**
 * Gets the display label for a VAT receivable line item
 * 
 * @param vatCategory - The VAT category
 * @returns The human-readable label for the VAT receivable
 * 
 * @example
 * ```typescript
 * getVATReceivableLabel('airtime')
 * // Returns: "VAT Receivable - Communication Airtime"
 * 
 * getVATReceivableLabel('infrastructure')
 * // Returns: "VAT Receivable - Infrastructure Support"
 * ```
 */
export function getVATReceivableLabel(vatCategory: VATApplicableCategory): string {
  const labelMap: Record<VATApplicableCategory, string> = {
    [VAT_APPLICABLE_CATEGORIES.AIRTIME]: 'VAT Receivable - Communication Airtime',
    [VAT_APPLICABLE_CATEGORIES.INTERNET]: 'VAT Receivable - Communication Internet',
    [VAT_APPLICABLE_CATEGORIES.INFRASTRUCTURE]: 'VAT Receivable - Infrastructure Support',
    [VAT_APPLICABLE_CATEGORIES.OFFICE_SUPPLIES]: 'VAT Receivable - Office Supplies',
  };
  
  return labelMap[vatCategory];
}

/**
 * Gets all VAT receivable codes for a given project and facility type
 * 
 * @param projectType - The project type (HIV, MAL, TB)
 * @param facilityType - The facility type (hospital, health_center)
 * @returns Array of all VAT receivable codes for this project/facility combination
 * 
 * @example
 * ```typescript
 * getAllVATReceivableCodes('HIV', 'hospital')
 * // Returns: [
 * //   "HIV_EXEC_HOSPITAL_D_VAT_AIRTIME",
 * //   "HIV_EXEC_HOSPITAL_D_VAT_INTERNET",
 * //   "HIV_EXEC_HOSPITAL_D_VAT_INFRASTRUCTURE",
 * //   "HIV_EXEC_HOSPITAL_D_VAT_SUPPLIES"
 * // ]
 * ```
 */
export function getAllVATReceivableCodes(
  projectType: 'HIV' | 'MAL' | 'TB',
  facilityType: 'hospital' | 'health_center'
): string[] {
  return Object.values(VAT_APPLICABLE_CATEGORIES).map(category =>
    getVATReceivableCode(projectType, facilityType, category)
  );
}

/**
 * Checks if a given code is a VAT receivable code
 * 
 * @param code - The activity code to check
 * @returns true if the code represents a VAT receivable
 * 
 * @example
 * ```typescript
 * isVATReceivableCode("HIV_EXEC_HOSPITAL_D_VAT_AIRTIME") // true
 * isVATReceivableCode("HIV_EXEC_HOSPITAL_D_1") // false
 * ```
 */
export function isVATReceivableCode(code: string): boolean {
  return code.includes('_D_VAT_') || code.includes('_E_VAT_'); // Support both old and new codes for backward compatibility
}

/**
 * Extracts the VAT category from a VAT receivable code
 * 
 * @param code - The VAT receivable code
 * @returns The VAT category or null if not a valid VAT receivable code
 * 
 * @example
 * ```typescript
 * getVATCategoryFromCode("HIV_EXEC_HOSPITAL_D_VAT_AIRTIME") // "airtime"
 * getVATCategoryFromCode("HIV_EXEC_HOSPITAL_D_1") // null
 * ```
 */
export function getVATCategoryFromCode(code: string): VATApplicableCategory | null {
  if (!isVATReceivableCode(code)) {
    return null;
  }
  
  const codeLower = code.toLowerCase();
  
  if (codeLower.includes('_vat_airtime')) return VAT_APPLICABLE_CATEGORIES.AIRTIME;
  if (codeLower.includes('_vat_internet')) return VAT_APPLICABLE_CATEGORIES.INTERNET;
  if (codeLower.includes('_vat_infrastructure')) return VAT_APPLICABLE_CATEGORIES.INFRASTRUCTURE;
  if (codeLower.includes('_vat_supplies')) return VAT_APPLICABLE_CATEGORIES.OFFICE_SUPPLIES;
  
  return null;
}
