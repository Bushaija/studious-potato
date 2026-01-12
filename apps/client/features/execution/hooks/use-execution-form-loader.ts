/**
 * Backward Compatibility Loader for Execution Forms
 * 
 * This hook provides data migration logic to handle historical execution records
 * that have VAT receivables stored in Section E (old structure) and automatically
 * migrate them to Section D (new structure).
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useCallback } from 'react';

interface ActivityQuarterValues {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  comment?: string;
  paymentStatus?: any;
  amountPaid?: any;
  netAmount?: Record<string, number>;
  vatAmount?: Record<string, number>;
  vatCleared?: Record<string, number>;
}

type FormData = Record<string, ActivityQuarterValues>;

interface MigrationResult {
  data: FormData;
  migrated: boolean;
  migratedCodes: string[];
}

/**
 * Hook for loading execution form data with backward compatibility
 * 
 * Automatically detects and migrates VAT receivables from Section E to Section D
 * when loading historical records.
 */
export function useExecutionFormLoader() {
  /**
   * Load form data with automatic migration of old VAT structure
   * 
   * @param savedData - The saved form data to load
   * @returns Migrated form data with VAT receivables in Section D
   * 
   * Requirements:
   * - 7.1: Load existing records that have VAT receivables in Section E
   * - 7.2: Display loaded VAT receivables in Section D regardless of original location
   * - 7.3: Preserve VAT receivable balances when loading historical records
   * - 7.4: Preserve VAT clearance history when loading historical records
   * - 7.5: Save updated records with VAT receivables in Section D
   */
  const loadFormData = useCallback((savedData: FormData): MigrationResult => {
    if (!savedData || typeof savedData !== 'object') {
      return {
        data: savedData || {},
        migrated: false,
        migratedCodes: [],
      };
    }

    // Check if this is an old record with VAT receivables in Section E
    // Requirement 7.1: Detect old VAT structure
    const oldVATCodes = Object.keys(savedData).filter(key => 
      key.includes('_E_VAT_')
    );

    if (oldVATCodes.length === 0) {
      return {
        data: savedData,
        migrated: false,
        migratedCodes: [],
      };
    }

    // Migrate VAT receivable data from Section E codes to Section D codes
    // Requirement 7.2: Automatic migration to Section D
    const migratedData: FormData = { ...savedData };
    const migratedCodes: string[] = [];

    oldVATCodes.forEach(oldCode => {
      // Create new Section D key by replacing _E_VAT_ with _D_VAT_
      const newCode = oldCode.replace('_E_VAT_', '_D_VAT_');
      
      const oldActivity = savedData[oldCode];
      
      if (!oldActivity) {
        console.warn('⚠️ [FormLoader] Old activity data not found for code:', oldCode);
        return;
      }

      // Preserve all VAT tracking data
      // Requirements 7.3, 7.4: Preserve balances and clearance history
      const migratedActivity: ActivityQuarterValues = {
        q1: oldActivity.q1 ?? 0,
        q2: oldActivity.q2 ?? 0,
        q3: oldActivity.q3 ?? 0,
        q4: oldActivity.q4 ?? 0,
        comment: oldActivity.comment ?? '',
        paymentStatus: oldActivity.paymentStatus,
        amountPaid: oldActivity.amountPaid,
        // Preserve VAT tracking fields (quarter-specific)
        netAmount: oldActivity.netAmount ?? {},
        vatAmount: oldActivity.vatAmount ?? {},
        vatCleared: oldActivity.vatCleared ?? {},
      };

      // Copy data to new Section D key
      migratedData[newCode] = migratedActivity;
      
      // Remove old Section E key
      delete migratedData[oldCode];
      
      migratedCodes.push(oldCode);
    });

    return {
      data: migratedData,
      migrated: true,
      migratedCodes,
    };
  }, []);

  /**
   * Check if form data contains old VAT structure
   * 
   * @param savedData - The saved form data to check
   * @returns True if old VAT structure is detected
   */
  const hasOldVATStructure = useCallback((savedData: FormData): boolean => {
    if (!savedData || typeof savedData !== 'object') {
      return false;
    }

    return Object.keys(savedData).some(key => key.includes('_E_VAT_'));
  }, []);

  /**
   * Get list of old VAT codes that need migration
   * 
   * @param savedData - The saved form data to check
   * @returns Array of old VAT codes
   */
  const getOldVATCodes = useCallback((savedData: FormData): string[] => {
    if (!savedData || typeof savedData !== 'object') {
      return [];
    }

    return Object.keys(savedData).filter(key => key.includes('_E_VAT_'));
  }, []);

  return {
    loadFormData,
    hasOldVATStructure,
    getOldVATCodes,
  };
}
