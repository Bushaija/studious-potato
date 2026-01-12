import type { BudgetVsActualMapping } from './financial-reports.types';

/**
 * CustomEventMapper handles complex event mappings for Budget vs Actual statements
 * where budget and actual columns may use different event codes for the same line item.
 */
export class CustomEventMapper {
  private mappings: Map<string, BudgetVsActualMapping> = new Map();

  constructor(mappings: BudgetVsActualMapping[] = []) {
    this.loadMappings(mappings);
  }

  /**
   * Load custom event mappings from configuration
   */
  private loadMappings(mappings: BudgetVsActualMapping[]): void {
    this.mappings.clear();
    for (const mapping of mappings) {
      this.mappings.set(mapping.lineCode, mapping);
    }
  }

  /**
   * Get custom event mapping for a specific line code
   * @param lineCode - The line code to look up (e.g., 'TRANSFERS_PUBLIC', 'GOODS_SERVICES')
   * @returns BudgetVsActualMapping if found, null otherwise
   */
  getEventMapping(lineCode: string): BudgetVsActualMapping | null {
    return this.mappings.get(lineCode) || null;
  }

  /**
   * Apply custom event mapping to get budget and actual amounts
   * @param mapping - The custom mapping configuration
   * @param planningData - Map of event codes to planning amounts
   * @param executionData - Map of event codes to execution amounts
   * @returns Object with budgetAmount and actualAmount
   */
  applyMapping(
    mapping: BudgetVsActualMapping,
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): { budgetAmount: number; actualAmount: number } {
    // Sum amounts from budget events (typically from planning data)
    const budgetAmount = mapping.budgetEvents.reduce((sum, eventCode) => {
      const amount = planningData.get(eventCode) || 0;
      return sum + amount;
    }, 0);

    // Sum amounts from actual events (typically from execution data)
    const actualAmount = mapping.actualEvents.reduce((sum, eventCode) => {
      const amount = executionData.get(eventCode) || 0;
      return sum + amount;
    }, 0);

    return { budgetAmount, actualAmount };
  }

  /**
   * Check if a line code has a custom mapping
   * @param lineCode - The line code to check
   * @returns true if custom mapping exists, false otherwise
   */
  hasCustomMapping(lineCode: string): boolean {
    return this.mappings.has(lineCode);
  }

  /**
   * Get all configured mappings
   * @returns Array of all BudgetVsActualMapping configurations
   */
  getAllMappings(): BudgetVsActualMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Validate that all mapped event codes exist in the provided event data
   * @param planningData - Available planning event codes
   * @param executionData - Available execution event codes
   * @returns Validation result with any missing event codes
   */
  validateMappings(
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): { isValid: boolean; missingEvents: string[]; warnings: string[] } {
    const missingEvents: string[] = [];
    const warnings: string[] = [];

    for (const mapping of this.mappings.values()) {
      // Check budget events (usually in planning data)
      for (const eventCode of mapping.budgetEvents) {
        if (!planningData.has(eventCode)) {
          missingEvents.push(`Budget event '${eventCode}' for line '${mapping.lineCode}'`);
        }
      }

      // Check actual events (usually in execution data)
      for (const eventCode of mapping.actualEvents) {
        if (!executionData.has(eventCode)) {
          missingEvents.push(`Actual event '${eventCode}' for line '${mapping.lineCode}'`);
        }
      }

      // Warn if mapping has no events
      if (mapping.budgetEvents.length === 0) {
        warnings.push(`Line '${mapping.lineCode}' has no budget events configured`);
      }
      if (mapping.actualEvents.length === 0) {
        warnings.push(`Line '${mapping.lineCode}' has no actual events configured`);
      }
    }

    return {
      isValid: missingEvents.length === 0,
      missingEvents,
      warnings
    };
  }

  /**
   * Validate that event codes exist in the database
   * @param availableEventCodes - Set of all available event codes from database
   * @returns Validation result with invalid event codes
   */
  validateEventCodesExist(availableEventCodes: Set<string>): { 
    isValid: boolean; 
    invalidEvents: string[]; 
    affectedLines: string[] 
  } {
    const invalidEvents: string[] = [];
    const affectedLines: string[] = [];

    for (const mapping of this.mappings.values()) {
      let lineHasInvalidEvents = false;

      // Check budget events
      for (const eventCode of mapping.budgetEvents) {
        if (!availableEventCodes.has(eventCode)) {
          invalidEvents.push(eventCode);
          lineHasInvalidEvents = true;
        }
      }

      // Check actual events
      for (const eventCode of mapping.actualEvents) {
        if (!availableEventCodes.has(eventCode)) {
          invalidEvents.push(eventCode);
          lineHasInvalidEvents = true;
        }
      }

      if (lineHasInvalidEvents) {
        affectedLines.push(mapping.lineCode);
      }
    }

    return {
      isValid: invalidEvents.length === 0,
      invalidEvents: [...new Set(invalidEvents)], // Remove duplicates
      affectedLines: [...new Set(affectedLines)]   // Remove duplicates
    };
  }

  /**
   * Apply mapping with graceful error handling
   * @param mapping - The custom mapping configuration
   * @param planningData - Map of event codes to planning amounts
   * @param executionData - Map of event codes to execution amounts
   * @param logger - Optional logger function for warnings
   * @returns Object with budgetAmount, actualAmount, and any warnings
   */
  applyMappingWithErrorHandling(
    mapping: BudgetVsActualMapping,
    planningData: Map<string, number>,
    executionData: Map<string, number>,
    logger?: (message: string) => void
  ): { 
    budgetAmount: number; 
    actualAmount: number; 
    warnings: string[] 
  } {
    const warnings: string[] = [];

    // Sum amounts from budget events with error handling
    let budgetAmount = 0;
    for (const eventCode of mapping.budgetEvents) {
      const amount = planningData.get(eventCode);
      if (amount === undefined) {
        const warning = `Budget event '${eventCode}' not found for line '${mapping.lineCode}', using 0`;
        warnings.push(warning);
        if (logger) logger(warning);
      } else {
        budgetAmount += amount;
      }
    }

    // Sum amounts from actual events with error handling
    let actualAmount = 0;
    for (const eventCode of mapping.actualEvents) {
      const amount = executionData.get(eventCode);
      if (amount === undefined) {
        const warning = `Actual event '${eventCode}' not found for line '${mapping.lineCode}', using 0`;
        warnings.push(warning);
        // Reduced logging: Don't log individual missing events, they're already in warnings array
        // if (logger) logger(warning);
      } else {
        actualAmount += amount;
      }
    }

    return { budgetAmount, actualAmount, warnings };
  }

  /**
   * Get fallback mapping for lines without custom configuration
   * Uses standard event mapping logic where budget uses PLANNING events and actual uses EXECUTION events
   * @param lineCode - The line code
   * @param eventCodes - Standard event codes from template
   * @returns Fallback mapping configuration
   */
  getFallbackMapping(lineCode: string, eventCodes: string[]): BudgetVsActualMapping {
    // Ensure all event codes are strings and filter out invalid values
    const validEventCodes = eventCodes
      .filter(code => code != null && typeof code === 'string')
      .map(code => String(code));
    
    if (validEventCodes.length === 0) {
      // Reduced logging: Use debug level for missing event codes (expected for some lines)
      console.debug(`[CustomEventMapper] No valid event codes for line ${lineCode}`);
      return {
        lineCode,
        budgetEvents: [],
        actualEvents: [],
      };
    }
    
    // For fallback, assume budget uses PLANNING versions and actual uses standard versions
    const budgetEvents = validEventCodes.map(code => {
      // If it's already a planning event, use as-is
      if (code.includes('_PLANNING')) return code;
      // Otherwise, try to find a planning equivalent
      return `${code}_PLANNING`;
    });

    return {
      lineCode,
      budgetEvents,
      actualEvents: validEventCodes, // Use original event codes for actual
    };
  }
}

/**
 * Default Budget vs Actual event mappings based on requirements
 * These handle the complex scenarios where budget and actual use different events
 */
export const DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS: BudgetVsActualMapping[] = [
  {
    lineCode: 'TRANSFERS_PUBLIC',
    budgetEvents: ['GOODS_SERVICES_PLANNING'],
    actualEvents: ['TRANSFERS_PUBLIC_ENTITIES'],
    note: 4
  },
  {
    lineCode: 'GOODS_SERVICES',
    budgetEvents: ['GOODS_SERVICES_PLANNING'],
    actualEvents: ['GOODS_SERVICES', 'GRANTS_TRANSFERS'],
    note: 23
  }
];