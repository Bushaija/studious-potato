/**
 * Working Capital Calculator Service
 * 
 * Calculates working capital changes (receivables and payables) for Cash Flow Statements
 * using the indirect method. Queries balance sheet data from schema_form_data_entries
 * for both current and previous periods, calculates period-over-period changes, and
 * applies correct signs for cash flow adjustments.
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { Database } from "@/db";
import { 
  reportingPeriods, 
  schemaFormDataEntries, 
  configurableEventMappings, 
  events,
  facilities
} from "@/db/schema";
import { createServiceLogger } from "@/lib/logger/logger";
import { eq, and, inArray, sql, lt, desc } from "drizzle-orm";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Working capital change for a specific account type
 */
export interface WorkingCapitalChange {
  accountType: 'RECEIVABLES' | 'PAYABLES';
  currentPeriodBalance: number;
  previousPeriodBalance: number;
  change: number;
  cashFlowAdjustment: number;
  eventCodes: string[];
  facilityBreakdown?: FacilityWorkingCapitalBreakdown[];
}

/**
 * Facility-level breakdown of working capital changes
 */
export interface FacilityWorkingCapitalBreakdown {
  facilityId: number;
  facilityName: string;
  currentBalance: number;
  previousBalance: number;
  change: number;
  cashFlowAdjustment: number;
}

/**
 * Result of working capital calculation
 */
export interface WorkingCapitalCalculationResult {
  receivablesChange: WorkingCapitalChange;
  payablesChange: WorkingCapitalChange;
  warnings: string[];
  metadata: {
    currentPeriodId: number;
    previousPeriodId: number | null;
    facilitiesIncluded: number[];
    calculationTimestamp: Date;
  };
}

/**
 * Parameters for calculating working capital changes
 */
export interface CalculateChangesParams {
  reportingPeriodId: number;
  projectId: number;
  facilityId?: number;
  facilityIds?: number[];
  projectType: string;
}

// ============================================================================
// EVENT CODE CONSTANTS
// ============================================================================

/**
 * Event codes for receivables accounts
 */
const RECEIVABLES_EVENT_CODES = [
  'ADVANCE_PAYMENTS',
  'RECEIVABLES_EXCHANGE',
  'RECEIVABLES_NON_EXCHANGE'
];

/**
 * Event codes for payables accounts
 */
const PAYABLES_EVENT_CODES = [
  'PAYABLES'
];

// ============================================================================
// WORKING CAPITAL CALCULATOR SERVICE
// ============================================================================

/**
 * Service for calculating working capital changes for cash flow statements
 */
export class WorkingCapitalCalculator {
  private logger = createServiceLogger('WorkingCapitalCalculator');

  /**
   * Create a new WorkingCapitalCalculator instance
   * @param db Database instance
   */
  constructor(private db: Database) {
    this.logger.debug('WorkingCapitalCalculator initialized');
  }

  /**
   * Calculate working capital changes for a reporting period
   * 
   * This is the main entry point for working capital calculations.
   * It queries balance sheet data for current and previous periods,
   * calculates changes, and applies cash flow signs.
   * 
   * Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.4
   * 
   * @param params Calculation parameters
   * @returns Working capital calculation result
   */
  async calculateChanges(params: CalculateChangesParams): Promise<WorkingCapitalCalculationResult> {
    this.logger.info(`Calculating working capital changes for period ${params.reportingPeriodId}`);
    
    const warnings: string[] = [];
    
    try {
      // Determine effective facility IDs
      const effectiveFacilityIds = this.getEffectiveFacilityIds(params);
      
      if (effectiveFacilityIds.length === 0) {
        throw new Error('No facility IDs provided for working capital calculation');
      }
      
      this.logger.debug(`Effective facility IDs: ${effectiveFacilityIds.join(', ')}`);
      
      // Check if multi-facility aggregation is needed
      const isMultiFacility = effectiveFacilityIds.length > 1;
      
      // Get previous period
      const previousPeriod = await this.getPreviousPeriod(params.reportingPeriodId);
      
      if (!previousPeriod) {
        warnings.push('No previous period found. Using zero as baseline for previous period balances.');
        this.logger.warn('No previous period found, using zero baseline');
      }
      
      // Query current period balance sheet data
      const currentReceivables = await this.queryBalanceSheetData({
        reportingPeriodId: params.reportingPeriodId,
        projectId: params.projectId,
        facilityIds: effectiveFacilityIds,
        eventCodes: RECEIVABLES_EVENT_CODES
      });
      
      const currentPayables = await this.queryBalanceSheetData({
        reportingPeriodId: params.reportingPeriodId,
        projectId: params.projectId,
        facilityIds: effectiveFacilityIds,
        eventCodes: PAYABLES_EVENT_CODES
      });
      
      // Query previous period balance sheet data (or use zero)
      let previousReceivables = new Map<string, number>();
      let previousPayables = new Map<string, number>();
      
      if (previousPeriod) {
        previousReceivables = await this.queryBalanceSheetData({
          reportingPeriodId: previousPeriod.id,
          projectId: params.projectId,
          facilityIds: effectiveFacilityIds,
          eventCodes: RECEIVABLES_EVENT_CODES
        });
        
        previousPayables = await this.queryBalanceSheetData({
          reportingPeriodId: previousPeriod.id,
          projectId: params.projectId,
          facilityIds: effectiveFacilityIds,
          eventCodes: PAYABLES_EVENT_CODES
        });
      }
      
      // Calculate totals
      const currentReceivablesTotal = this.sumBalances(currentReceivables);
      const previousReceivablesTotal = this.sumBalances(previousReceivables);
      const currentPayablesTotal = this.sumBalances(currentPayables);
      const previousPayablesTotal = this.sumBalances(previousPayables);
      
      // Calculate changes
      const receivablesChange = currentReceivablesTotal - previousReceivablesTotal;
      const payablesChange = currentPayablesTotal - previousPayablesTotal;
      
      // Apply cash flow signs
      const receivablesCashFlowAdjustment = this.applyCashFlowSigns('RECEIVABLES', receivablesChange);
      const payablesCashFlowAdjustment = this.applyCashFlowSigns('PAYABLES', payablesChange);
      
      this.logger.info(
        `Working capital changes calculated: ` +
        `Receivables: ${receivablesChange} → ${receivablesCashFlowAdjustment}, ` +
        `Payables: ${payablesChange} → ${payablesCashFlowAdjustment}`
      );
      
      // Generate validation warnings
      this.generateValidationWarnings(
        warnings,
        currentReceivablesTotal,
        previousReceivablesTotal,
        receivablesChange,
        currentPayablesTotal,
        previousPayablesTotal,
        payablesChange
      );
      
      // Generate facility breakdown if multi-facility (Requirements: 4.1, 4.2, 4.4)
      let receivablesFacilityBreakdown: FacilityWorkingCapitalBreakdown[] | undefined;
      let payablesFacilityBreakdown: FacilityWorkingCapitalBreakdown[] | undefined;
      
      if (isMultiFacility) {
        this.logger.debug('Generating facility breakdown for multi-facility aggregation');
        
        receivablesFacilityBreakdown = await this.generateFacilityBreakdown({
          reportingPeriodId: params.reportingPeriodId,
          previousPeriodId: previousPeriod?.id || null,
          projectId: params.projectId,
          facilityIds: effectiveFacilityIds,
          eventCodes: RECEIVABLES_EVENT_CODES,
          accountType: 'RECEIVABLES'
        });
        
        payablesFacilityBreakdown = await this.generateFacilityBreakdown({
          reportingPeriodId: params.reportingPeriodId,
          previousPeriodId: previousPeriod?.id || null,
          projectId: params.projectId,
          facilityIds: effectiveFacilityIds,
          eventCodes: PAYABLES_EVENT_CODES,
          accountType: 'PAYABLES'
        });
        
        // Check for facilities with missing data
        const facilitiesWithData = new Set<number>();
        receivablesFacilityBreakdown.forEach(f => {
          if (f.currentBalance !== 0 || f.previousBalance !== 0) {
            facilitiesWithData.add(f.facilityId);
          }
        });
        payablesFacilityBreakdown.forEach(f => {
          if (f.currentBalance !== 0 || f.previousBalance !== 0) {
            facilitiesWithData.add(f.facilityId);
          }
        });
        
        const facilitiesWithMissingData = effectiveFacilityIds.filter(
          id => !facilitiesWithData.has(id)
        );
        
        if (facilitiesWithMissingData.length > 0) {
          warnings.push(
            `Facilities with no balance sheet data: ${facilitiesWithMissingData.join(', ')}`
          );
        }
      }
      
      return {
        receivablesChange: {
          accountType: 'RECEIVABLES',
          currentPeriodBalance: currentReceivablesTotal,
          previousPeriodBalance: previousReceivablesTotal,
          change: receivablesChange,
          cashFlowAdjustment: receivablesCashFlowAdjustment,
          eventCodes: RECEIVABLES_EVENT_CODES,
          facilityBreakdown: receivablesFacilityBreakdown
        },
        payablesChange: {
          accountType: 'PAYABLES',
          currentPeriodBalance: currentPayablesTotal,
          previousPeriodBalance: previousPayablesTotal,
          change: payablesChange,
          cashFlowAdjustment: payablesCashFlowAdjustment,
          eventCodes: PAYABLES_EVENT_CODES,
          facilityBreakdown: payablesFacilityBreakdown
        },
        warnings,
        metadata: {
          currentPeriodId: params.reportingPeriodId,
          previousPeriodId: previousPeriod?.id || null,
          facilitiesIncluded: effectiveFacilityIds,
          calculationTimestamp: new Date()
        }
      };
      
    } catch (error) {
      this.logger.error(
        `Error calculating working capital changes: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Query balance sheet data for a specific period
   * 
   * Queries schema_form_data_entries joined with configurable_event_mappings
   * and events tables. Filters by project, reporting period, facility, entity type
   * (EXECUTION), and event codes. Aggregates amounts by event code using SUM.
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.6
   * 
   * @param params Query parameters
   * @returns Map of event code to total amount
   */
  private async queryBalanceSheetData(params: {
    reportingPeriodId: number;
    projectId: number;
    facilityIds: number[];
    eventCodes: string[];
  }): Promise<Map<string, number>> {
    this.logger.debug(
      `Querying balance sheet data: period=${params.reportingPeriodId}, ` +
      `project=${params.projectId}, facilities=${params.facilityIds.join(',')}, ` +
      `events=${params.eventCodes.join(',')}`
    );
    
    try {
      // Build the query
      const results = await this.db
        .select({
          eventCode: events.code,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${schemaFormDataEntries.formData}->>'amount' AS NUMERIC)), 0)`
        })
        .from(schemaFormDataEntries)
        .innerJoin(
          configurableEventMappings,
          eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId)
        )
        .innerJoin(
          events,
          eq(configurableEventMappings.eventId, events.id)
        )
        .where(
          and(
            eq(schemaFormDataEntries.projectId, params.projectId),
            eq(schemaFormDataEntries.reportingPeriodId, params.reportingPeriodId),
            eq(schemaFormDataEntries.entityType, 'execution'),
            inArray(events.code, params.eventCodes),
            inArray(schemaFormDataEntries.facilityId, params.facilityIds)
          )
        )
        .groupBy(events.code);
      
      // Convert results to Map
      const balanceMap = new Map<string, number>();
      for (const row of results) {
        balanceMap.set(row.eventCode, row.totalAmount);
      }
      
      this.logger.debug(
        `Balance sheet data retrieved: ${results.length} event codes, ` +
        `total: ${this.sumBalances(balanceMap)}`
      );
      
      return balanceMap;
      
    } catch (error) {
      this.logger.error(
        `Error querying balance sheet data: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get the previous reporting period
   * 
   * Queries reporting_periods table for period with endDate before current period's
   * startDate and same period type. Returns null if previous period not found.
   * 
   * Requirements: 5.4, 5.5
   * 
   * @param currentPeriodId Current reporting period ID
   * @returns Previous reporting period or null
   */
  private async getPreviousPeriod(
    currentPeriodId: number
  ): Promise<typeof reportingPeriods.$inferSelect | null> {
    this.logger.debug(`Getting previous period for current period ${currentPeriodId}`);
    
    try {
      // Get current period
      const currentPeriod = await this.db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.id, currentPeriodId)
      });
      
      if (!currentPeriod) {
        this.logger.warn(`Current period ${currentPeriodId} not found`);
        return null;
      }
      
      this.logger.debug(
        `Current period: year=${currentPeriod.year}, type=${currentPeriod.periodType}, ` +
        `startDate=${currentPeriod.startDate}, endDate=${currentPeriod.endDate}`
      );
      
      // Query for previous period using date comparison
      // Previous period's endDate should be before current period's startDate
      const whereConditions = [
        lt(reportingPeriods.endDate, currentPeriod.startDate)
      ];
      
      // Add periodType filter if it exists
      if (currentPeriod.periodType) {
        whereConditions.push(eq(reportingPeriods.periodType, currentPeriod.periodType));
      }
      
      const previousPeriod = await this.db.query.reportingPeriods.findFirst({
        where: and(...whereConditions),
        orderBy: [desc(reportingPeriods.endDate)]
      });
      
      if (!previousPeriod) {
        this.logger.info(
          `No previous period found for period ${currentPeriodId}. ` +
          `This may be the first period of type ${currentPeriod.periodType}.`
        );
        return null;
      }
      
      this.logger.info(
        `Found previous period: id=${previousPeriod.id}, year=${previousPeriod.year}, ` +
        `type=${previousPeriod.periodType}, endDate=${previousPeriod.endDate}`
      );
      
      return previousPeriod;
      
    } catch (error) {
      this.logger.error(
        `Error getting previous period: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Apply cash flow adjustment signs
   * 
   * For RECEIVABLES: return negative of change (increase = subtract from cash flow)
   * For PAYABLES: return positive of change (increase = add to cash flow)
   * 
   * Requirements: 1.3, 2.3
   * 
   * @param accountType Account type (RECEIVABLES or PAYABLES)
   * @param change Period-over-period change
   * @returns Signed cash flow adjustment
   */
  private applyCashFlowSigns(
    accountType: 'RECEIVABLES' | 'PAYABLES',
    change: number
  ): number {
    if (accountType === 'RECEIVABLES') {
      // Increase in receivables = cash outflow (subtract)
      // Decrease in receivables = cash inflow (add)
      return -change;
    } else {
      // Increase in payables = cash inflow (add)
      // Decrease in payables = cash outflow (subtract)
      return change;
    }
  }

  /**
   * Get effective facility IDs from parameters
   * 
   * @param params Calculation parameters
   * @returns Array of facility IDs
   */
  private getEffectiveFacilityIds(params: CalculateChangesParams): number[] {
    if (params.facilityIds && params.facilityIds.length > 0) {
      return params.facilityIds;
    }
    if (params.facilityId) {
      return [params.facilityId];
    }
    return [];
  }

  /**
   * Sum all balances in a map
   * 
   * @param balanceMap Map of event code to amount
   * @returns Total sum
   */
  private sumBalances(balanceMap: Map<string, number>): number {
    let total = 0;
    for (const amount of balanceMap.values()) {
      total += amount;
    }
    return total;
  }

  /**
   * Generate validation warnings for unusual data patterns
   * 
   * Requirements: 1.6, 2.6
   * 
   * @param warnings Array to append warnings to
   * @param currentReceivables Current receivables balance
   * @param previousReceivables Previous receivables balance
   * @param receivablesChange Change in receivables
   * @param currentPayables Current payables balance
   * @param previousPayables Previous payables balance
   * @param payablesChange Change in payables
   */
  private generateValidationWarnings(
    warnings: string[],
    currentReceivables: number,
    previousReceivables: number,
    receivablesChange: number,
    currentPayables: number,
    previousPayables: number,
    payablesChange: number
  ): void {
    // Check for negative receivables balance (error condition)
    if (currentReceivables < 0) {
      warnings.push(
        `Negative receivables balance detected: ${currentReceivables.toFixed(2)}. ` +
        `This may indicate data quality issues.`
      );
    }
    
    // Check for extreme variance (>100% change)
    if (previousReceivables > 0) {
      const receivablesVariance = Math.abs(receivablesChange / previousReceivables);
      if (receivablesVariance > 1.0) {
        warnings.push(
          `Significant variance in receivables: changed by ${(receivablesVariance * 100).toFixed(1)}% ` +
          `(from ${previousReceivables.toFixed(2)} to ${currentReceivables.toFixed(2)})`
        );
      }
    }
    
    if (previousPayables > 0) {
      const payablesVariance = Math.abs(payablesChange / previousPayables);
      if (payablesVariance > 1.0) {
        warnings.push(
          `Significant variance in payables: changed by ${(payablesVariance * 100).toFixed(1)}% ` +
          `(from ${previousPayables.toFixed(2)} to ${currentPayables.toFixed(2)})`
        );
      }
    }
  }

  /**
   * Generate facility-level breakdown of working capital changes
   * 
   * Requirements: 4.1, 4.2, 4.4
   * 
   * @param params Breakdown parameters
   * @returns Array of facility breakdowns
   */
  private async generateFacilityBreakdown(params: {
    reportingPeriodId: number;
    previousPeriodId: number | null;
    projectId: number;
    facilityIds: number[];
    eventCodes: string[];
    accountType: 'RECEIVABLES' | 'PAYABLES';
  }): Promise<FacilityWorkingCapitalBreakdown[]> {
    this.logger.debug(
      `Generating facility breakdown for ${params.accountType}: ` +
      `${params.facilityIds.length} facilities`
    );
    
    const breakdown: FacilityWorkingCapitalBreakdown[] = [];
    
    // Get facility names
    const facilityRecords = await this.db.query.facilities.findMany({
      where: inArray(facilities.id, params.facilityIds)
    });
    
    const facilityMap = new Map<number, string>();
    for (const facility of facilityRecords) {
      facilityMap.set(facility.id, facility.name);
    }
    
    // Query balance sheet data with facility-level detail
    for (const facilityId of params.facilityIds) {
      // Current period balance
      const currentBalance = await this.queryBalanceSheetDataForFacility({
        reportingPeriodId: params.reportingPeriodId,
        projectId: params.projectId,
        facilityId,
        eventCodes: params.eventCodes
      });
      
      // Previous period balance
      let previousBalance = 0;
      if (params.previousPeriodId) {
        previousBalance = await this.queryBalanceSheetDataForFacility({
          reportingPeriodId: params.previousPeriodId,
          projectId: params.projectId,
          facilityId,
          eventCodes: params.eventCodes
        });
      }
      
      // Calculate change and cash flow adjustment
      const change = currentBalance - previousBalance;
      const cashFlowAdjustment = this.applyCashFlowSigns(params.accountType, change);
      
      breakdown.push({
        facilityId,
        facilityName: facilityMap.get(facilityId) || `Facility ${facilityId}`,
        currentBalance,
        previousBalance,
        change,
        cashFlowAdjustment
      });
    }
    
    this.logger.debug(
      `Facility breakdown generated: ${breakdown.length} facilities, ` +
      `total change: ${breakdown.reduce((sum, f) => sum + f.change, 0)}`
    );
    
    return breakdown;
  }

  /**
   * Query balance sheet data for a single facility
   * 
   * Requirements: 4.1, 4.2
   * 
   * @param params Query parameters
   * @returns Total balance for the facility
   */
  private async queryBalanceSheetDataForFacility(params: {
    reportingPeriodId: number;
    projectId: number;
    facilityId: number;
    eventCodes: string[];
  }): Promise<number> {
    try {
      const results = await this.db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${schemaFormDataEntries.formData}->>'amount' AS NUMERIC)), 0)`
        })
        .from(schemaFormDataEntries)
        .innerJoin(
          configurableEventMappings,
          eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId)
        )
        .innerJoin(
          events,
          eq(configurableEventMappings.eventId, events.id)
        )
        .where(
          and(
            eq(schemaFormDataEntries.projectId, params.projectId),
            eq(schemaFormDataEntries.reportingPeriodId, params.reportingPeriodId),
            eq(schemaFormDataEntries.entityType, 'EXECUTION'),
            eq(schemaFormDataEntries.facilityId, params.facilityId),
            inArray(events.code, params.eventCodes)
          )
        );
      
      return results[0]?.totalAmount || 0;
      
    } catch (error) {
      this.logger.error(
        `Error querying balance sheet data for facility ${params.facilityId}: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
      return 0;
    }
  }
}
