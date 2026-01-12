/**
 * Activity Code Mapper Utility
 * 
 * Provides mapping between UI schema activity codes and actual formData activity codes.
 * This is necessary because the UI schema uses simplified codes (e.g., _D_4, _D_5)
 * while the actual formData stores data under descriptive codes (e.g., _D_VAT_AIRTIME, _D_VAT_INTERNET).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import type { PreviousQuarterBalances } from '@/features/execution/types/quarterly-rollover';

/**
 * Mapping rules for activity codes
 * Maps UI schema suffixes to actual formData suffixes
 */
const CODE_MAPPINGS: Record<string, string> = {
  // VAT receivables (old numeric codes to new descriptive codes)
  '_D_4': '_D_VAT_AIRTIME',
  '_D_5': '_D_VAT_INTERNET',
  '_D_6': '_D_VAT_INFRASTRUCTURE',
  '_D_7': '_D_VAT_SUPPLIES',
  
  // D-01 subcategory items (subcategory format to regular format)
  '_D_D-01_1': '_D_VAT_AIRTIME',
  '_D_D-01_2': '_D_VAT_INTERNET',
  '_D_D-01_3': '_D_VAT_INFRASTRUCTURE',
  '_D_D-01_4': '_D_VAT_SUPPLIES',
  '_D_D-01_5': '_D_4', // Other receivables
  
  // G-01 subcategory items (subcategory format to regular format)
  '_G_G-01_1': '_G_1',
  '_G_G-01_2': '_G_2',
  '_G_G-01_3': '_G_3',
};

/**
 * Map UI schema code to actual formData code
 * 
 * @param uiCode - UI schema code (e.g., "HIV_EXEC_HOSPITAL_D_4")
 * @param projectType - Project type (e.g., "HIV")
 * @param facilityType - Facility type (e.g., "hospital")
 * @returns Actual formData code or the original code if no mapping exists
 * 
 * @example
 * mapUICodeToFormDataCode("HIV_EXEC_HOSPITAL_D_4", "HIV", "hospital")
 * // Returns: "HIV_EXEC_HOSPITAL_D_VAT_AIRTIME"
 * 
 * mapUICodeToFormDataCode("HIV_EXEC_HOSPITAL_D_1", "HIV", "hospital")
 * // Returns: "HIV_EXEC_HOSPITAL_D_1" (no mapping needed)
 */
export function mapUICodeToFormDataCode(
  uiCode: string,
  projectType: string,
  facilityType: string
): string {
  // Check if this code needs mapping
  for (const [uiSuffix, formDataSuffix] of Object.entries(CODE_MAPPINGS)) {
    if (uiCode.includes(uiSuffix)) {
      // Replace the UI suffix with the formData suffix
      const mappedCode = uiCode.replace(uiSuffix, formDataSuffix);
      console.log(`[Activity Code Mapper] Mapped UI code: ${uiCode} → ${mappedCode}`);
      return mappedCode;
    }
  }
  
  // No mapping needed, return original code
  return uiCode;
}

/**
 * Map actual formData code to UI schema code
 * 
 * @param formDataCode - Actual formData code (e.g., "HIV_EXEC_HOSPITAL_D_VAT_AIRTIME")
 * @param projectType - Project type (e.g., "HIV")
 * @param facilityType - Facility type (e.g., "hospital")
 * @returns UI schema code or the original code if no mapping exists
 * 
 * @example
 * mapFormDataCodeToUICode("HIV_EXEC_HOSPITAL_D_VAT_AIRTIME", "HIV", "hospital")
 * // Returns: "HIV_EXEC_HOSPITAL_D_4"
 * 
 * mapFormDataCodeToUICode("HIV_EXEC_HOSPITAL_D_1", "HIV", "hospital")
 * // Returns: "HIV_EXEC_HOSPITAL_D_1" (no mapping needed)
 */
export function mapFormDataCodeToUICode(
  formDataCode: string,
  projectType: string,
  facilityType: string
): string {
  // Reverse mapping
  for (const [uiSuffix, formDataSuffix] of Object.entries(CODE_MAPPINGS)) {
    if (formDataCode.includes(formDataSuffix)) {
      // Replace the formData suffix with the UI suffix
      const mappedCode = formDataCode.replace(formDataSuffix, uiSuffix);
      console.log(`[Activity Code Mapper] Mapped formData code: ${formDataCode} → ${mappedCode}`);
      return mappedCode;
    }
  }
  
  // No mapping needed, return original code
  return formDataCode;
}

/**
 * Get opening balance from previous quarter using code mapping
 * 
 * This function handles the code mismatch between UI schema codes and actual formData codes.
 * It attempts to map the UI code to the formData code and then looks up the balance.
 * 
 * @param uiCode - UI schema code (e.g., "HIV_EXEC_HOSPITAL_D_4")
 * @param previousQuarterBalances - Previous quarter balances from API
 * @param projectType - Project type (e.g., "HIV")
 * @param facilityType - Facility type (e.g., "hospital")
 * @returns Opening balance or 0 if not found
 * 
 * @example
 * // Q1 closing balance for VAT Airtime: 3000
 * getOpeningBalanceWithMapping(
 *   "HIV_EXEC_HOSPITAL_D_4",
 *   previousQuarterBalances,
 *   "HIV",
 *   "hospital"
 * )
 * // Returns: 3000 (found under "HIV_EXEC_HOSPITAL_D_VAT_AIRTIME")
 */
export function getOpeningBalanceWithMapping(
  uiCode: string,
  previousQuarterBalances: PreviousQuarterBalances | null,
  projectType: string,
  facilityType: string
): number {
  // Check if previous quarter data exists
  if (!previousQuarterBalances || !previousQuarterBalances.exists) {
    return 0;
  }
  
  // Try to map UI code to formData code
  const formDataCode = mapUICodeToFormDataCode(uiCode, projectType, facilityType);
  
  if (!formDataCode) {
    console.warn(`[Activity Code Mapper] No mapping found for UI code: ${uiCode}`);
    return 0;
  }
  
  // Determine which section to look in (D or E)
  const section = formDataCode.includes('_D_') ? 'D' : 'E';
  
  // Look up the balance using the mapped code
  const closingBalances = previousQuarterBalances.closingBalances;
  
  if (!closingBalances) {
    console.warn(`[Activity Code Mapper] No closing balances available in previous quarter data`);
    return 0;
  }
  
  const balance = closingBalances[section]?.[formDataCode];
  
  if (balance === undefined || balance === null) {
    console.warn(
      `[Activity Code Mapper] No balance found for code: ${formDataCode} (mapped from ${uiCode}) in Section ${section}`
    );
    return 0;
  }
  
  // Validate that the balance is a valid number
  const numericBalance = Number(balance);
  
  if (!isFinite(numericBalance)) {
    console.error(
      `[Activity Code Mapper] Invalid balance value for ${formDataCode}: ${balance}`
    );
    return 0;
  }
  
  console.log(
    `[Activity Code Mapper] Found opening balance for ${uiCode} (${formDataCode}): ${numericBalance}`
  );
  
  return numericBalance;
}
