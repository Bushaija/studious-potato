/**
 * Carryforward Service
 * 
 * Handles automatic carryforward of ending cash balances from previous periods
 * to beginning cash balances of current periods in cash flow statements.
 * 
 * Requirements: 1.1, 1.2, 1.4, 8.1, 8.2, 8.3
 */

import { Database } from "@/db";
import { reportingPeriods, financialReports, projects, schemaFormDataEntries, configurableEventMappings, events, facilities } from "@/db/schema";
import { createServiceLogger } from "@/lib/logger/logger";
import { eq, and, lt, desc, sql, inArray } from "drizzle-orm";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Options for retrieving beginning cash via carryforward
 */
export interface CarryforwardOptions {
  /** Current reporting period ID */
  reportingPeriodId: number;
  
  /** Single facility ID (for facility-specific statements) */
  facilityId?: number;
  
  /** Multiple facility IDs (for district-level aggregation) */
  facilityIds?: number[];
  
  /** Project type (e.g., 'HIV', 'Malaria', 'TB') */
  projectType: string;
  
  /** Statement code (e.g., 'CASH_FLOW') */
  statementCode: string;
}

/**
 * Result of carryforward operation
 */
export interface CarryforwardResult {
  /** Whether the carryforward operation was successful */
  success: boolean;
  
  /** The beginning cash amount to use */
  beginningCash: number;
  
  /** Source of the beginning cash value */
  source: 'CARRYFORWARD' | 'CARRYFORWARD_AGGREGATED' | 'MANUAL_ENTRY' | 'FALLBACK';
  
  /** Additional metadata about the carryforward */
  metadata: CarryforwardMetadata;
  
  /** Warnings generated during carryforward */
  warnings: string[];
}

/**
 * Metadata about the carryforward operation
 */
export interface CarryforwardMetadata {
  /** Previous reporting period ID (if found) */
  previousPeriodId?: number;
  
  /** Ending cash from previous period (if found) */
  previousPeriodEndingCash?: number;
  
  /** Manual entry amount (if exists) */
  manualEntryAmount?: number;
  
  /** Discrepancy between carryforward and manual entry */
  discrepancy?: number;
  
  /** Override reason (if manual entry differs from carryforward) */
  overrideReason?: string;
  
  /** Error message (if operation failed) */
  error?: string;
  
  /** Facility breakdown for aggregated carryforward */
  facilityBreakdown?: FacilityCarryforwardBreakdown[];
  
  /** Timestamp of the carryforward operation */
  timestamp?: string;
}

/**
 * Breakdown of carryforward by facility (for district-level statements)
 */
export interface FacilityCarryforwardBreakdown {
  /** Facility ID */
  facilityId: number;
  
  /** Facility name */
  facilityName: string;
  
  /** Ending cash from this facility's previous period */
  endingCash: number;
}

/**
 * Aggregated carryforward metadata for district-level statements
 */
export interface AggregatedCarryforwardMetadata extends CarryforwardMetadata {
  /** Source is always aggregated */
  source: 'CARRYFORWARD_AGGREGATED';
  
  /** Breakdown by facility */
  facilityBreakdown: FacilityCarryforwardBreakdown[];
  
  /** Total beginning cash (sum of all facilities) */
  totalBeginningCash: number;
  
  /** Facilities with missing data */
  facilitiesWithMissingData: number[];
}

// ============================================================================
// CARRYFORWARD SERVICE
// ============================================================================

/**
 * Service for handling cash flow beginning cash carryforward logic
 */
export class CarryforwardService {
  private logger = createServiceLogger('CarryforwardService');
  
  /**
   * Create a new CarryforwardService instance
   * @param db Database instance
   */
  constructor(private db: Database) {
    this.logger.debug('CarryforwardService initialized');
  }
  
  /**
   * Get beginning cash for the current period via carryforward
   * 
   * This is the main entry point for the carryforward logic.
   * It attempts to retrieve the ending cash from the previous period
   * and use it as the beginning cash for the current period.
   * 
   * Implements override detection (Requirements: 6.1, 6.2, 6.3)
   * Includes timeout handling (Requirements: 7.4, 8.4)
   * 
   * @param options Carryforward options
   * @returns CarryforwardResult with beginning cash and metadata
   */
  async getBeginningCash(options: CarryforwardOptions): Promise<CarryforwardResult> {
    this.logger.info(`Getting beginning cash via carryforward for period ${options.reportingPeriodId}`);
    
    try {
      // Wrap the entire operation with timeout handling (Requirements: 7.4, 8.4)
      return await Promise.race([
        this.performCarryforward(options),
        new Promise<CarryforwardResult>((_, reject) => 
          setTimeout(() => reject(new Error('Carryforward operation timeout')), 15000) // 15 second overall timeout
        )
      ]);
      
    } catch (error) {
      // Handle timeout and other errors (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Carryforward operation timeout') {
        this.logger.error(
          `Carryforward operation timeout for period ${options.reportingPeriodId}. ` +
          `Operation exceeded 15 second limit. Falling back to manual entry.`
        );
        
        return this.fallbackToManualEntry(options, 'Carryforward operation timed out');
      }
      
      this.logger.error(`Error in getBeginningCash: ${error instanceof Error ? error.message : String(error)}`);
      
      return this.handleError(error, options);
    }
  }
  
  /**
   * Perform the actual carryforward logic
   * 
   * This method contains the core carryforward logic, separated from the main
   * getBeginningCash method to allow for timeout handling.
   * 
   * @param options Carryforward options
   * @returns CarryforwardResult with beginning cash and metadata
   */
  private async performCarryforward(options: CarryforwardOptions): Promise<CarryforwardResult> {
    try {
      // Step 1: Get manual entry first (Requirement: 6.1)
      const manualEntryResult = await this.getManualBeginningCash(
        options.reportingPeriodId,
        options.facilityId,
        options.projectType
      );
      
      const manualEntry = manualEntryResult.amount;
      const overrideReason = manualEntryResult.reason;
      
      this.logger.debug(`Manual entry amount: ${manualEntry}` + (overrideReason ? `, reason: ${overrideReason}` : ''));
      
      // Step 2: Get previous period
      const previousPeriod = await this.getPreviousPeriod(options.reportingPeriodId);
      
      if (!previousPeriod) {
        this.logger.info('No previous period found, using manual entry or zero');
        
        // If manual entry exists, use it (Requirement: 6.1)
        if (manualEntry > 0) {
          return {
            success: true,
            beginningCash: manualEntry,
            source: 'MANUAL_ENTRY',
            metadata: {
              manualEntryAmount: manualEntry,
              overrideReason: overrideReason,
              timestamp: new Date().toISOString()
            },
            warnings: ['No previous period found. Using manual entry.']
          };
        }
        
        // No previous period and no manual entry
        return {
          success: false,
          beginningCash: 0,
          source: 'FALLBACK',
          metadata: {
            error: 'No previous period found',
            timestamp: new Date().toISOString()
          },
          warnings: ['No previous period found and no manual entry available.']
        };
      }
      
      // Step 3: Handle single facility vs multi-facility
      let carryforwardAmount = 0;
      let aggregationMetadata: {
        facilityBreakdown?: FacilityCarryforwardBreakdown[];
        facilitiesWithMissingData?: number[];
      } = {};
      const aggregationWarnings: string[] = [];
      
      if (options.facilityIds && options.facilityIds.length > 1) {
        // Multi-facility aggregation (Task 5)
        this.logger.debug('Multi-facility aggregation requested');
        const aggregationResult = await this.getAggregatedBeginningCashWithMetadata(
          previousPeriod.id,
          options.facilityIds,
          options.projectType
        );
        
        carryforwardAmount = aggregationResult.totalBeginningCash;
        aggregationMetadata = {
          facilityBreakdown: aggregationResult.facilityBreakdown,
          facilitiesWithMissingData: aggregationResult.facilitiesWithMissingData
        };
        aggregationWarnings.push(...aggregationResult.warnings);
      } else {
        // Single facility
        const facilityId = options.facilityId || (options.facilityIds && options.facilityIds[0]);
        
        if (!facilityId) {
          this.logger.error('No facility ID provided for single facility query');
          return this.fallbackToManualEntry(options, 'No facility ID provided');
        }
        
        carryforwardAmount = await this.getPreviousPeriodEndingCash(
          previousPeriod.id,
          facilityId,
          options.projectType
        );
        
        if (carryforwardAmount === 0) {
          this.logger.info('No previous period ending cash found from execution data');
          
          // If manual entry exists, use it (Requirement: 6.1)
          if (manualEntry > 0) {
            return {
              success: true,
              beginningCash: manualEntry,
              source: 'MANUAL_ENTRY',
              metadata: {
                previousPeriodId: previousPeriod.id,
                manualEntryAmount: manualEntry,
                overrideReason: overrideReason,
                timestamp: new Date().toISOString()
              },
              warnings: ['No previous period ending cash found from execution data. Using manual entry.']
            };
          }
          
          return this.fallbackToManualEntry(options, 'No previous period ending cash found from execution data');
        }
      }
      
      this.logger.debug(`Carryforward amount: ${carryforwardAmount}`);
      
      // Step 4: Implement override detection (Requirements: 6.1, 6.2, 6.3)
      const tolerance = 0.01; // Tolerance for floating point comparison (Requirement: 6.2)
      
      // Determine source based on whether this is aggregated or single facility
      const isAggregated = options.facilityIds && options.facilityIds.length > 1;
      const carryforwardSource = isAggregated ? 'CARRYFORWARD_AGGREGATED' : 'CARRYFORWARD';
      
      // If manual entry exists and differs from carryforward, use manual entry (Requirement: 6.1, 6.2)
      if (manualEntry > 0) {
        const discrepancy = Math.abs(manualEntry - carryforwardAmount);
        
        // Check if values differ beyond tolerance (Requirement: 6.2)
        if (discrepancy > tolerance) {
          this.logger.warn(
            `Manual entry (${manualEntry}) differs from carryforward (${carryforwardAmount}) ` +
            `by ${discrepancy}. Using manual entry.`
          );
          
          // Use manual entry but include carryforward info in metadata (Requirement: 6.3, 6.4)
          return {
            success: true,
            beginningCash: manualEntry,
            source: 'MANUAL_ENTRY',
            metadata: {
              previousPeriodId: previousPeriod.id,
              previousPeriodEndingCash: carryforwardAmount,
              manualEntryAmount: manualEntry,
              discrepancy: manualEntry - carryforwardAmount,
              overrideReason: overrideReason,
              ...aggregationMetadata,
              timestamp: new Date().toISOString()
            },
            warnings: [
              `Beginning cash override detected: Manual entry (${manualEntry.toFixed(2)}) ` +
              `differs from previous period ending cash (${carryforwardAmount.toFixed(2)}) ` +
              `by ${discrepancy.toFixed(2)}. Using manual entry value.` +
              (overrideReason ? ` Reason: ${overrideReason}` : ''),
              ...aggregationWarnings
            ]
          };
        }
        
        // Values match within tolerance, use manual entry
        this.logger.debug('Manual entry matches carryforward within tolerance');
        return {
          success: true,
          beginningCash: manualEntry,
          source: 'MANUAL_ENTRY',
          metadata: {
            previousPeriodId: previousPeriod.id,
            previousPeriodEndingCash: carryforwardAmount,
            manualEntryAmount: manualEntry,
            discrepancy: 0,
            overrideReason: overrideReason,
            ...aggregationMetadata,
            timestamp: new Date().toISOString()
          },
          warnings: [...aggregationWarnings]
        };
      }
      
      // Step 5: No manual entry, use carryforward
      if (carryforwardAmount === 0) {
        // Reduced logging: Use debug level for zero cash (common for first period)
        this.logger.debug('Previous period ending cash is zero');
        return {
          success: true,
          beginningCash: 0,
          source: carryforwardSource,
          metadata: {
            previousPeriodId: previousPeriod.id,
            previousPeriodEndingCash: 0,
            ...aggregationMetadata,
            timestamp: new Date().toISOString()
          },
          warnings: [
            'Previous period ending cash is zero. This may indicate missing data or a new account.',
            ...aggregationWarnings
          ]
        };
      }
      
      // Successful carryforward
      this.logger.info(`Successfully carried forward ${carryforwardAmount} from period ${previousPeriod.id}`);
      return {
        success: true,
        beginningCash: carryforwardAmount,
        source: carryforwardSource,
        metadata: {
          previousPeriodId: previousPeriod.id,
          previousPeriodEndingCash: carryforwardAmount,
          ...aggregationMetadata,
          timestamp: new Date().toISOString()
        },
        warnings: [...aggregationWarnings]
      };
      
    } catch (error) {
      this.logger.error(`Error in performCarryforward: ${error instanceof Error ? error.message : String(error)}`);
      
      return this.handleError(error, options);
    }
  }
  
  /**
   * Get the previous reporting period based on the current period
   * 
   * This method identifies the previous period by:
   * 1. Querying the current period from the database
   * 2. Calculating the previous period based on period type and year
   * 3. Handling edge cases (first period, missing periods)
   * 
   * Requirements: 2.1, 2.2, 2.5, 8.1, 8.2, 8.3
   * 
   * @param currentPeriodId Current reporting period ID
   * @returns Previous reporting period or null if not found
   */
  private async getPreviousPeriod(currentPeriodId: number): Promise<typeof reportingPeriods.$inferSelect | null> {
    this.logger.debug(`Getting previous period for current period ${currentPeriodId}`);
    
    try {
      // Step 1: Get current period from database with timeout handling
      const currentPeriod = await Promise.race([
        this.db.query.reportingPeriods.findFirst({
          where: eq(reportingPeriods.id, currentPeriodId)
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      if (!currentPeriod) {
        this.logger.warn(`Current period ${currentPeriodId} not found in database`);
        return null;
      }
      
      this.logger.debug(
        `Current period: year=${currentPeriod.year}, type=${currentPeriod.periodType}, ` +
        `startDate=${currentPeriod.startDate}, endDate=${currentPeriod.endDate}`
      );
      
      // Step 2: Calculate previous period based on period type
      const periodType = currentPeriod.periodType;
      
      // Handle different period types (Requirements: 2.2, 2.3, 2.4)
      switch (periodType) {
        case 'ANNUAL':
          // For annual periods, previous period is year - 1 (Requirement: 2.2)
          this.logger.debug(`ANNUAL period: current year=${currentPeriod.year}, looking for year ${currentPeriod.year - 1}`);
          break;
          
        case 'QUARTERLY':
          // For quarterly periods, we need to identify the quarter and calculate previous quarter
          // Q1 → Q4 of previous year
          // Q2 → Q1 of same year
          // Q3 → Q2 of same year
          // Q4 → Q3 of same year
          // (Requirement: 2.3)
          const currentQuarter = this.extractQuarterFromDate(currentPeriod.startDate);
          const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
          const previousQuarterYear = currentQuarter === 1 ? currentPeriod.year - 1 : currentPeriod.year;
          
          this.logger.debug(
            `QUARTERLY period: current Q${currentQuarter} ${currentPeriod.year}, ` +
            `looking for Q${previousQuarter} ${previousQuarterYear}`
          );
          break;
          
        case 'MONTHLY':
          // For monthly periods, we need to identify the month and calculate previous month
          // January → December of previous year
          // Other months → previous month of same year
          // (Requirement: 2.4)
          const currentMonth = this.extractMonthFromDate(currentPeriod.startDate);
          const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const previousMonthYear = currentMonth === 1 ? currentPeriod.year - 1 : currentPeriod.year;
          
          this.logger.debug(
            `MONTHLY period: current month ${currentMonth} ${currentPeriod.year}, ` +
            `looking for month ${previousMonth} ${previousMonthYear}`
          );
          break;
          
        default:
          this.logger.warn(`Unknown period type: ${periodType}`);
          break;
      }
      
      // Step 3: Query for previous period using date comparison with timeout
      // The previous period's endDate should be before the current period's startDate
      // This handles all period types correctly (Requirement: 2.1, 2.5)
      // We use date comparison because it's more reliable than trying to match
      // specific year/quarter/month combinations, especially with fiscal years
      const whereConditions = [
        lt(reportingPeriods.endDate, currentPeriod.startDate)
      ];
      
      // Only add periodType filter if it exists
      if (periodType) {
        whereConditions.push(eq(reportingPeriods.periodType, periodType));
      }
      
      const previousPeriod = await Promise.race([
        this.db.query.reportingPeriods.findFirst({
          where: and(...whereConditions),
          orderBy: [desc(reportingPeriods.endDate)] // Get the most recent previous period
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      if (!previousPeriod) {
        this.logger.info(
          `No previous period found for period ${currentPeriodId}. ` +
          `This may be the first period of type ${periodType}.`
        );
        return null;
      }
      
      // Reduced logging: Use debug level for previous period details
      this.logger.debug(
        `Found previous period: id=${previousPeriod.id}, year=${previousPeriod.year}, ` +
        `type=${previousPeriod.periodType}, endDate=${previousPeriod.endDate}`
      );
      
      return previousPeriod;
      
    } catch (error) {
      // Enhanced error handling with appropriate severity (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Database query timeout') {
        this.logger.error(
          `Database query timeout getting previous period for ${currentPeriodId}. ` +
          `Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting previous period for ${currentPeriodId}: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Return null to allow fallback logic to handle the error (Requirement: 8.1)
      return null;
    }
  }
  
  /**
   * Extract quarter number (1-4) from a date
   * Uses fiscal year quarters: Q1 (Jul-Sep), Q2 (Oct-Dec), Q3 (Jan-Mar), Q4 (Apr-Jun)
   * 
   * @param dateString Date string in YYYY-MM-DD format
   * @returns Quarter number (1-4)
   */
  private extractQuarterFromDate(dateString: string): number {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    
    // Fiscal year quarters (assuming July start)
    if (month >= 7 && month <= 9) return 1;   // Q1: Jul-Sep
    if (month >= 10 && month <= 12) return 2; // Q2: Oct-Dec
    if (month >= 1 && month <= 3) return 3;   // Q3: Jan-Mar
    return 4;                                  // Q4: Apr-Jun
  }
  
  /**
   * Extract month number (1-12) from a date
   * 
   * @param dateString Date string in YYYY-MM-DD format
   * @returns Month number (1-12)
   */
  private extractMonthFromDate(dateString: string): number {
    const date = new Date(dateString);
    return date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  }
  
  /**
   * Get the previous period's ending cash directly from execution data
   * 
   * This method calculates the ending cash from the previous period by
   * reading the cumulative_balance values from execution data and negating them
   * for the cash flow statement context.
   * 
   * Requirements: 1.1, 3.2, 4.1, 8.1, 8.2, 8.3
   * 
   * @param previousPeriodId Previous reporting period ID
   * @param facilityId Facility ID (required for single facility queries)
   * @param projectType Project type (e.g., 'HIV', 'Malaria', 'TB')
   * @returns Previous period ending cash amount
   */
  private async getPreviousPeriodEndingCash(
    previousPeriodId: number,
    facilityId: number,
    projectType: string
  ): Promise<number> {
    this.logger.debug(
      `Getting previous period ending cash from execution data: period=${previousPeriodId}, facility=${facilityId}, project=${projectType}`
    );
    
    try {
      // Step 1: Get project ID from project type with timeout (Requirement: 4.1, 8.3)
      const project = await Promise.race([
        this.getProjectByType(projectType),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Project query timeout')), 5000)
        )
      ]);
      
      if (!project) {
        this.logger.warn(`Project not found for type: ${projectType}`);
        return 0;
      }
      
      this.logger.debug(`Found project: id=${project.id}, name=${project.name}, type=${project.projectType}`);
      
      // Step 2: Get execution data for the previous period
      const executionData = await this.getExecutionData(previousPeriodId, facilityId, project.id);
      
      if (!executionData) {
        // Reduced logging: Use debug level instead of info to reduce noise
        this.logger.debug(
          `No execution data found for: period=${previousPeriodId}, ` +
          `facility=${facilityId}, project=${projectType}`
        );
        return 0;
      }
      
      // Step 3: Calculate ending cash from execution data
      const endingCash = this.calculateEndingCashFromExecution(executionData);
      
      this.logger.info(
        `Calculated ending cash from execution data: ${endingCash} for ` +
        `period=${previousPeriodId}, facility=${facilityId}, project=${projectType}`
      );
      
      return endingCash;
      
    } catch (error) {
      // Enhanced error handling with appropriate severity (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Project query timeout') {
        this.logger.error(
          `Database query timeout getting previous period ending cash: period=${previousPeriodId}, ` +
          `facility=${facilityId}, project=${projectType}. Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting previous period ending cash: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Return 0 to allow fallback logic to handle the error (Requirement: 8.1)
      return 0;
    }
  }
  
  /**
   * Get execution data for a specific period, facility, and project
   * 
   * @param reportingPeriodId Reporting period ID
   * @param facilityId Facility ID
   * @param projectId Project ID
   * @returns Execution data or null if not found
   */
  private async getExecutionData(
    reportingPeriodId: number,
    facilityId: number,
    projectId: number
  ): Promise<any | null> {
    this.logger.debug(
      `Getting execution data: period=${reportingPeriodId}, facility=${facilityId}, project=${projectId}`
    );
    
    try {
      // Query with timeout handling (Requirement: 8.3)
      const executionEntry = await Promise.race([
        this.db.query.schemaFormDataEntries.findFirst({
          where: and(
            eq(schemaFormDataEntries.entityType, 'execution'),
            eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
            eq(schemaFormDataEntries.facilityId, facilityId),
            eq(schemaFormDataEntries.projectId, projectId)
          )
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Execution data query timeout')), 5000)
        )
      ]);
      
      if (!executionEntry) {
        this.logger.debug(
          `No execution data found for period=${reportingPeriodId}, facility=${facilityId}, project=${projectId}`
        );
        return null;
      }
      
      return executionEntry.formData;
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Execution data query timeout') {
        this.logger.error(
          `Database query timeout getting execution data: period=${reportingPeriodId}, ` +
          `facility=${facilityId}, project=${projectId}. Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting execution data: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      return null;
    }
  }
  
  /**
   * Calculate ending cash from execution data
   * 
   * According to the accounting team, cash and cash equivalents are calculated as:
   * Sum of cumulative_balance of "Cash at bank" + cumulative_balance of "Petty cash"
   * + cumulative_balance of "Other receivables" + net VAT receivables
   * 
   * These are Section D (Financial Assets) items, specifically:
   * - Activity code ending with _D_1: Cash at bank
   * - Activity code ending with _D_2: Petty cash
   * - Activity code ending with _D_3: Other receivables
   * - VAT receivables: From vatReceivables object (amount - cleared)
   * 
   * For stock items like cash, cumulative_balance represents the latest quarter value.
   * 
   * @param executionData Execution data from schema_form_data_entries
   * @returns Calculated ending cash amount
   */
  private calculateEndingCashFromExecution(executionData: any): number {
    this.logger.debug('Calculating ending cash from execution data (Section D activities)');
    
    try {
      if (!executionData) {
        this.logger.warn('No execution data provided for cash calculation');
        return 0;
      }
      
      if (!executionData.activities) {
        this.logger.warn('No activities found in execution data');
      }
      
      const activities = executionData.activities || {};
      
      // Log the raw execution data for debugging
      this.logger.debug('Raw execution data keys:', Object.keys(executionData).join(', '));
      if (executionData.vatReceivables) {
        this.logger.debug('VAT receivables found in execution data');
      } else {
        this.logger.warn('No VAT receivables found in execution data');
      }
      
      // Initialize all Section D components
      let cashAtBank = 0;
      let pettyCash = 0;
      let otherReceivables = 0;
      let vatReceivables = 0;
      
      // Calculate VAT receivables total
      if (executionData.vatReceivables && typeof executionData.vatReceivables === 'object') {
        this.logger.debug('Processing VAT receivables...');
        Object.entries(executionData.vatReceivables).forEach(([category, vatData]: [string, any]) => {
          this.logger.debug(`Processing VAT category: ${category}`);
          
          if (vatData && typeof vatData === 'object') {
            const quarter = this.extractQuarterFromDate(new Date());
            const amount = Number(vatData[`q${quarter}`] || 0);
            const cleared = Number(vatData[`q${quarter}_cleared`] || 0);
            const netReceivable = Math.max(0, amount - cleared);
            
            this.logger.debug(
              `VAT Receivable [${category}]: ` +
              `Amount=${amount}, Cleared=${cleared}, Net=${netReceivable}`
            );
            
            vatReceivables += netReceivable;
          } else {
            this.logger.warn(`Invalid VAT data format for category: ${category}`);
          }
        });
      }
      
      // Find Section D activities
      for (const [activityCode, activityData] of Object.entries(activities)) {
        const data = activityData as any;
        
        if (data.section === 'D') {
          if (activityCode.endsWith('_D_1')) {
            cashAtBank = data.cumulative_balance || 0;
            this.logger.debug(`Found Cash at bank (${activityCode}): ${cashAtBank}`);
          } else if (activityCode.endsWith('_D_2')) {
            pettyCash = data.cumulative_balance || 0;
            this.logger.debug(`Found Petty cash (${activityCode}): ${pettyCash}`);
          } else if (activityCode.endsWith('_D_3')) {
            otherReceivables = data.cumulative_balance || 0;
            this.logger.debug(`Found Other receivables (${activityCode}): ${otherReceivables}`);
          }
        }
      }
      
      const totalCash = cashAtBank + pettyCash + otherReceivables + vatReceivables;
      
      this.logger.debug(
        `Calculated ending cash: ` +
        `Cash at bank (${cashAtBank}) + ` +
        `Petty cash (${pettyCash}) + ` +
        `Other receivables (${otherReceivables}) + ` +
        `VAT receivables (${vatReceivables}) = ${totalCash}`
      );
      
      return totalCash;
      
    } catch (error) {
      this.logger.error(
        `Error calculating ending cash from execution data: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
      return 0;
    }
  }
  
  /**
   * Get project by project type
   * 
   * This helper method queries the projects table to find a project
   * matching the given project type.
   * 
   * Requirements: 4.1, 4.2, 4.3, 8.1, 8.2, 8.3
   * 
   * @param projectType Project type (e.g., 'HIV', 'Malaria', 'TB')
   * @returns Project or null if not found
   */
  private async getProjectByType(projectType: string): Promise<typeof projects.$inferSelect | null> {
    this.logger.debug(`Getting project by type: ${projectType}`);
    
    try {
      // Query with timeout handling (Requirement: 8.3)
      const project = await Promise.race([
        this.db.query.projects.findFirst({
          where: eq(projects.projectType, projectType as any)
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Project type query timeout')), 5000)
        )
      ]);
      
      if (!project) {
        this.logger.warn(`No project found with type: ${projectType}`);
        return null;
      }
      
      return project;
      
    } catch (error) {
      // Enhanced error handling with appropriate severity (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Project type query timeout') {
        this.logger.error(
          `Database query timeout getting project by type: ${projectType}. ` +
          `Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting project by type: ${projectType}: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Return null to allow fallback logic to handle the error (Requirement: 8.1)
      return null;
    }
  }
  
  /**
   * Extract ending cash from a financial statement
   * 
   * This method attempts to extract the ending cash balance from a statement
   * using multiple fallback strategies:
   * 1. From reportData.totals.ENDING_CASH
   * 2. From reportData.lines with lineCode ENDING_CASH
   * 3. From computedTotals.ENDING_CASH
   * 4. Return 0 if not found
   * 
   * Includes data validation to handle corrupted or invalid data.
   * 
   * Requirements: 1.1, 1.2, 8.2, 8.3
   * 
   * @param statement Financial statement
   * @returns Ending cash amount
   */
  private extractEndingCash(statement: typeof financialReports.$inferSelect): number {
    this.logger.debug(`Extracting ending cash from statement ${statement.id}`);
    
    try {
      // Step 1: Validate statement data structure (Requirement: 8.2, 8.3)
      const validationResult = this.validateStatementData(statement);
      if (!validationResult.isValid) {
        this.logger.warn(
          `Statement ${statement.id} has invalid data structure: ${validationResult.errors.join(', ')}`
        );
        // Continue with extraction but log warnings
      }
      
      const reportData = statement.reportData as any;
      const computedTotals = statement.computedTotals as any;
      
      // Strategy 1: Extract from reportData.totals.ENDING_CASH (Requirement: 1.1)
      if (reportData?.totals?.ENDING_CASH !== undefined && reportData.totals.ENDING_CASH !== null) {
        const endingCash = this.validateAndParseNumber(reportData.totals.ENDING_CASH, 'reportData.totals.ENDING_CASH');
        if (endingCash !== null) {
          this.logger.debug(`Found ending cash in reportData.totals: ${endingCash}`);
          return endingCash;
        }
      }
      
      // Strategy 2: Extract from reportData.lines with lineCode ENDING_CASH (Requirement: 1.1)
      if (reportData?.lines && Array.isArray(reportData.lines)) {
        const endingCashLine = reportData.lines.find(
          (line: any) => line.metadata?.lineCode === 'ENDING_CASH' || line.lineCode === 'ENDING_CASH'
        );
        
        if (endingCashLine) {
          // Try different possible field names for the value
          const possibleValues = [
            endingCashLine.currentPeriodValue,
            endingCashLine.value,
            endingCashLine.amount
          ];
          
          for (const value of possibleValues) {
            if (value !== undefined && value !== null) {
              const endingCash = this.validateAndParseNumber(value, 'reportData.lines.ENDING_CASH');
              if (endingCash !== null) {
                this.logger.debug(`Found ending cash in reportData.lines: ${endingCash}`);
                return endingCash;
              }
            }
          }
        }
      }
      
      // Strategy 3: Extract from computedTotals.ENDING_CASH (Requirement: 1.2)
      if (computedTotals?.ENDING_CASH !== undefined && computedTotals.ENDING_CASH !== null) {
        const endingCash = this.validateAndParseNumber(computedTotals.ENDING_CASH, 'computedTotals.ENDING_CASH');
        if (endingCash !== null) {
          this.logger.debug(`Found ending cash in computedTotals: ${endingCash}`);
          return endingCash;
        }
      }
      
      // Strategy 4: Return 0 if not found (Requirement: 1.2)
      this.logger.warn(
        `No ending cash found in statement ${statement.id}. ` +
        `Checked reportData.totals, reportData.lines, and computedTotals.`
      );
      return 0;
      
    } catch (error) {
      this.logger.error(
        `Error extracting ending cash from statement ${statement.id}: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
      return 0;
    }
  }
  
  /**
   * Validate statement data structure
   * 
   * This method validates the structure of a financial statement to detect
   * corrupted or invalid data.
   * 
   * Requirements: 8.2, 8.3
   * 
   * @param statement Financial statement to validate
   * @returns Validation result with errors
   */
  private validateStatementData(statement: typeof financialReports.$inferSelect): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    try {
      // Validate basic statement properties
      if (!statement.id) {
        errors.push('Statement ID is missing');
      }
      
      if (!statement.reportCode) {
        errors.push('Report code is missing');
      } else if (statement.reportCode !== 'CASH_FLOW') {
        errors.push(`Expected CASH_FLOW report code, got: ${statement.reportCode}`);
      }
      
      if (!statement.status) {
        errors.push('Statement status is missing');
      } else if (statement.status !== 'approved') {
        errors.push(`Expected approved status, got: ${statement.status}`);
      }
      
      // Validate reportData structure
      if (statement.reportData) {
        const reportData = statement.reportData as any;
        
        // Check if reportData is an object
        if (typeof reportData !== 'object') {
          errors.push('reportData is not an object');
        } else {
          // Validate totals structure
          if (reportData.totals && typeof reportData.totals !== 'object') {
            errors.push('reportData.totals is not an object');
          }
          
          // Validate lines structure
          if (reportData.lines && !Array.isArray(reportData.lines)) {
            errors.push('reportData.lines is not an array');
          }
        }
      }
      
      // Validate computedTotals structure
      if (statement.computedTotals) {
        const computedTotals = statement.computedTotals as any;
        
        if (typeof computedTotals !== 'object') {
          errors.push('computedTotals is not an object');
        }
      }
      
      // Check if statement has any data at all
      if (!statement.reportData && !statement.computedTotals) {
        errors.push('Statement has no reportData or computedTotals');
      }
      
    } catch (error) {
      errors.push(`Error validating statement structure: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate and parse a number value
   * 
   * This method validates that a value can be safely converted to a number
   * and handles various edge cases and invalid data.
   * 
   * Requirements: 8.2, 8.3
   * 
   * @param value Value to validate and parse
   * @param fieldName Name of the field for logging
   * @returns Parsed number or null if invalid
   */
  private validateAndParseNumber(value: any, fieldName: string): number | null {
    try {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return null;
      }
      
      // Handle already numeric values
      if (typeof value === 'number') {
        // Check for invalid numbers
        if (isNaN(value) || !isFinite(value)) {
          this.logger.warn(`Invalid number in ${fieldName}: ${value}`);
          return null;
        }
        return value;
      }
      
      // Handle string values
      if (typeof value === 'string') {
        // Remove common formatting characters
        const cleanValue = value.replace(/[,$\s]/g, '');
        
        // Check if empty after cleaning
        if (cleanValue === '') {
          return null;
        }
        
        const parsed = Number(cleanValue);
        
        // Check if parsing was successful
        if (isNaN(parsed) || !isFinite(parsed)) {
          this.logger.warn(`Cannot parse ${fieldName} as number: "${value}"`);
          return null;
        }
        
        return parsed;
      }
      
      // Handle boolean values (treat as 0/1)
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      
      // Handle other types
      this.logger.warn(`Unexpected type for ${fieldName}: ${typeof value}, value: ${value}`);
      return null;
      
    } catch (error) {
      this.logger.warn(
        `Error parsing ${fieldName}: ${error instanceof Error ? error.message : String(error)}, value: ${value}`
      );
      return null;
    }
  }
  
  /**
   * Validate and clean a string field
   * 
   * This method validates that a value is a valid string and cleans it
   * by trimming whitespace and handling edge cases.
   * 
   * Requirements: 8.2, 8.3
   * 
   * @param value Value to validate and clean
   * @returns Cleaned string or undefined if invalid
   */
  private validateStringField(value: any): string | undefined {
    try {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Handle string values
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
      }
      
      // Handle other types by converting to string
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      
      // Handle objects by converting to JSON (for debugging)
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return '[object]';
        }
      }
      
      return String(value);
      
    } catch (error) {
      this.logger.warn(
        `Error validating string field: ${error instanceof Error ? error.message : String(error)}, value: ${value}`
      );
      return undefined;
    }
  }
  
  /**
   * Get manual beginning cash entry from execution data
   * 
   * This method queries schemaFormDataEntries for CASH_OPENING_BALANCE events
   * and aggregates amounts if multiple entries exist.
   * 
   * Requirements: 6.1, 6.2, 6.4
   * 
   * @param reportingPeriodId Reporting period ID
   * @param facilityId Facility ID (optional)
   * @param projectType Project type
   * @returns Object containing manual entry amount and optional override reason
   */
  private async getManualBeginningCash(
    reportingPeriodId: number,
    facilityId: number | undefined,
    projectType: string
  ): Promise<{ amount: number; reason?: string }> {
    this.logger.debug(
      `Getting manual beginning cash: period=${reportingPeriodId}, facility=${facilityId}, project=${projectType}`
    );
    
    try {
      // Step 1: Get project ID from project type
      const project = await this.getProjectByType(projectType);
      
      if (!project) {
        this.logger.warn(`Project not found for type: ${projectType}`);
        return { amount: 0 };
      }
      
      // Step 2: Build query conditions for schemaFormDataEntries
      // We need to join with configurableEventMappings and events to filter by CASH_OPENING_BALANCE event code
      const conditions = [
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.projectId, project.id),
        eq(events.code, 'CASH_EQUIVALENTS_BEGIN')
      ];
      
      // Add facility filter if provided (Requirement: 6.1)
      if (facilityId !== undefined) {
        conditions.push(eq(schemaFormDataEntries.facilityId, facilityId));
      }
      
      this.logger.debug(
        `Querying for CASH_EQUIVALENTS_BEGIN events: period=${reportingPeriodId}, ` +
        `facility=${facilityId}, project=${project.id}`
      );
      
      // Step 3: Query for CASH_EQUIVALENTS_BEGIN entries with timeout (Requirement: 8.3)
      // Join schemaFormDataEntries -> configurableEventMappings -> events
      const results = await Promise.race([
        this.db
          .select({
            amount: sql<number>`COALESCE(CAST(${schemaFormDataEntries.formData}->>'amount' AS NUMERIC), 0)`,
            entryId: schemaFormDataEntries.id,
            facilityId: schemaFormDataEntries.facilityId,
            metadata: schemaFormDataEntries.metadata,
            formData: schemaFormDataEntries.formData
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
          .where(and(...conditions)),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Manual entry query timeout')), 5000)
        )
      ]);
      
      // Step 4: Validate and aggregate amounts if multiple entries exist (Requirement: 6.2, 8.2, 8.3)
      if (results.length === 0) {
        this.logger.debug('No manual beginning cash entries found');
        return { amount: 0 };
      }
      
      // Validate each result and calculate total
      let totalAmount = 0;
      const validResults: typeof results = [];
      
      for (const result of results) {
        // Validate the amount
        const validatedAmount = this.validateAndParseNumber(result.amount, `manual entry ${result.entryId}`);
        
        if (validatedAmount !== null) {
          totalAmount += validatedAmount;
          validResults.push({ ...result, amount: validatedAmount });
        } else {
          this.logger.warn(
            `Invalid amount in manual entry ${result.entryId}: ${result.amount}. Skipping entry.`
          );
        }
      }
      
      // Log validation results
      if (validResults.length < results.length) {
        this.logger.warn(
          `${results.length - validResults.length} out of ${results.length} manual entries had invalid amounts`
        );
      }
      
      // Step 5: Extract override reason from metadata or formData (Requirement: 6.4)
      let overrideReason: string | undefined;
      
      // Use the first valid result for reason extraction
      const firstValidResult = validResults[0];
      if (firstValidResult) {
        // Try to get reason from metadata
        if (firstValidResult.metadata) {
          const metadata = firstValidResult.metadata as any;
          overrideReason = this.validateStringField(metadata.overrideReason || metadata.reason || metadata.notes);
        }
        
        // If not in metadata, try formData
        if (!overrideReason && firstValidResult.formData) {
          const formData = firstValidResult.formData as any;
          overrideReason = this.validateStringField(formData.overrideReason || formData.reason || formData.notes);
        }
      }
      
      this.logger.info(
        `Found ${results.length} manual beginning cash entries, total amount: ${totalAmount}` +
        (overrideReason ? `, reason: ${overrideReason}` : '')
      );
      
      if (results.length > 1) {
        this.logger.warn(
          `Multiple CASH_EQUIVALENTS_BEGIN entries found (${results.length}). ` +
          `Aggregating amounts. Entry IDs: ${results.map(r => r.entryId).join(', ')}`
        );
      }
      
      return { 
        amount: totalAmount,
        reason: overrideReason
      };
      
    } catch (error) {
      // Enhanced error handling with timeout detection (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Manual entry query timeout') {
        this.logger.error(
          `Database query timeout getting manual beginning cash: period=${reportingPeriodId}, ` +
          `facility=${facilityId}, project=${projectType}. Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting manual beginning cash: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Return 0 on error to allow carryforward to continue (Requirement: 8.1)
      return { amount: 0 };
    }
  }
  
  /**
   * Get aggregated beginning cash for multiple facilities with detailed metadata
   * 
   * This method implements district-level aggregation by:
   * 1. Looping through all facility IDs (Task 5.1)
   * 2. Retrieving statement for each facility (Task 5.1)
   * 3. Summing ending cash values (Task 5.1)
   * 4. Tracking facility breakdown (Task 5.2)
   * 5. Handling missing facility data (Task 5.3)
   * 
   * Requirements: 3.3, 3.4, 8.1, 8.2
   * 
   * @param previousPeriodId Previous reporting period ID
   * @param facilityIds Array of facility IDs
   * @param projectType Project type
   * @returns Object containing aggregated amount, facility breakdown, and missing facility IDs
   */
  private async getAggregatedBeginningCashWithMetadata(
    previousPeriodId: number,
    facilityIds: number[],
    projectType: string
  ): Promise<{
    totalBeginningCash: number;
    facilityBreakdown: FacilityCarryforwardBreakdown[];
    facilitiesWithMissingData: number[];
    warnings: string[];
  }> {
    this.logger.debug(
      `Getting aggregated beginning cash: period=${previousPeriodId}, facilities=${facilityIds.length}, project=${projectType}`
    );
    
    try {
      // Task 5.1: Loop through all facility IDs and sum ending cash values
      let totalBeginningCash = 0;
      const facilityBreakdown: FacilityCarryforwardBreakdown[] = [];
      const facilitiesWithMissingData: number[] = [];
      const warnings: string[] = [];
      
      // Get facility names for all facilities (Task 5.2)
      const facilityRecords = await this.getFacilityNames(facilityIds);
      const facilityNameMap = new Map(
        facilityRecords.map(f => [f.id, f.name])
      );
      
      // Task 5.1: Retrieve statement for each facility and sum ending cash
      for (const facilityId of facilityIds) {
        this.logger.debug(`Processing facility ${facilityId}`);
        
        // Get ending cash from execution data for this facility (Task 5.1)
        const endingCash = await this.getPreviousPeriodEndingCash(
          previousPeriodId,
          facilityId,
          projectType
        );
        
        const facilityName = facilityNameMap.get(facilityId) || `Facility ${facilityId}`;
        
        if (endingCash !== 0) {
          // Sum the ending cash values (Task 5.1)
          totalBeginningCash += endingCash;
          
          // Task 5.2: Store individual facility ending cash amounts
          facilityBreakdown.push({
            facilityId,
            facilityName,
            endingCash
          });
          
          this.logger.debug(
            `Facility ${facilityId} (${facilityName}): ending cash = ${endingCash}`
          );
        } else {
          // Task 5.3: Handle missing facility data
          // Continue aggregation if some facilities missing (Requirement: 8.1)
          // Reduced logging: Only debug level for individual facilities, summary warning at the end
          this.logger.debug(
            `No execution data found for facility ${facilityId} (${facilityName}) in previous period`
          );
          
          // Task 5.3: Identify facilities with missing data
          facilitiesWithMissingData.push(facilityId);
          
          // Task 5.2: Still track the facility in breakdown with zero amount
          facilityBreakdown.push({
            facilityId,
            facilityName,
            endingCash: 0
          });
        }
      }
      
      // Reduced logging: Only log if there's actual data or if all facilities are missing
      if (totalBeginningCash > 0) {
        this.logger.info(
          `Aggregated beginning cash: ${totalBeginningCash} from ${facilityIds.length} facilities. ` +
          `Found data for ${facilityIds.length - facilitiesWithMissingData.length} facilities.`
        );
      } else if (facilitiesWithMissingData.length === facilityIds.length) {
        // All facilities missing - log at debug level to reduce noise
        this.logger.debug(
          `No previous period data found for any of the ${facilityIds.length} facilities.`
        );
      }
      
      // Task 5.3: Generate warnings for missing facilities (Requirement: 8.2)
      if (facilitiesWithMissingData.length > 0) {
        // Only log detailed warning if not all facilities are missing (to reduce noise)
        if (facilitiesWithMissingData.length < facilityIds.length) {
          const missingFacilityNames = facilitiesWithMissingData.map(id => {
            const name = facilityNameMap.get(id) || `Facility ${id}`;
            return `${name} (ID: ${id})`;
          }).join(', ');
          
          warnings.push(
            `Missing previous period statements for ${facilitiesWithMissingData.length} ` +
            `out of ${facilityIds.length} facilities: ${missingFacilityNames}`
          );
          
          this.logger.warn(warnings[warnings.length - 1]);
        } else {
          // All facilities missing - add to warnings but log at debug level
          warnings.push(
            `No previous period data available for any of the ${facilityIds.length} facilities. ` +
            `This is expected for the first reporting period.`
          );
          this.logger.debug(`All ${facilityIds.length} facilities missing previous period data`);
        }
      }
      
      return {
        totalBeginningCash,
        facilityBreakdown,
        facilitiesWithMissingData,
        warnings
      };
      
    } catch (error) {
      this.logger.error(
        `Error getting aggregated beginning cash: ${error instanceof Error ? error.message : String(error)}`
      );
      // Return empty result on error to allow statement generation to continue (Requirement: 8.1)
      return {
        totalBeginningCash: 0,
        facilityBreakdown: [],
        facilitiesWithMissingData: facilityIds,
        warnings: [`Error aggregating facility data: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }
  
  /**
   * Get aggregated beginning cash for multiple facilities (simplified version)
   * 
   * This is a simplified wrapper around getAggregatedBeginningCashWithMetadata
   * that only returns the total amount.
   * 
   * @param previousPeriodId Previous reporting period ID
   * @param facilityIds Array of facility IDs
   * @param projectType Project type
   * @returns Aggregated beginning cash amount
   */
  private async getAggregatedBeginningCash(
    previousPeriodId: number,
    facilityIds: number[],
    projectType: string
  ): Promise<number> {
    const result = await this.getAggregatedBeginningCashWithMetadata(
      previousPeriodId,
      facilityIds,
      projectType
    );
    return result.totalBeginningCash;
  }
  
  /**
   * Get facility names for a list of facility IDs
   * 
   * This helper method queries the facilities table to get names
   * for the given facility IDs. Used for facility breakdown tracking.
   * 
   * Task 5.2: Track facility names for reporting
   * Requirements: 8.1, 8.2, 8.3
   * 
   * @param facilityIds Array of facility IDs
   * @returns Array of facility records with id and name
   */
  private async getFacilityNames(
    facilityIds: number[]
  ): Promise<Array<{ id: number; name: string }>> {
    this.logger.debug(`Getting facility names for ${facilityIds.length} facilities`);
    
    try {
      if (facilityIds.length === 0) {
        return [];
      }
      
      // Query with timeout handling (Requirement: 8.3)
      const facilityRecords = await Promise.race([
        this.db
          .select({
            id: facilities.id,
            name: facilities.name
          })
          .from(facilities)
          .where(inArray(facilities.id, facilityIds)),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Facility names query timeout')), 5000)
        )
      ]);
      
      this.logger.debug(`Retrieved ${facilityRecords.length} facility names`);
      
      return facilityRecords;
      
    } catch (error) {
      // Enhanced error handling with appropriate severity (Requirements: 8.1, 8.2, 8.3)
      if (error instanceof Error && error.message === 'Facility names query timeout') {
        this.logger.error(
          `Database query timeout getting facility names for ${facilityIds.length} facilities. ` +
          `Query exceeded 5 second limit.`
        );
      } else {
        this.logger.error(
          `Database error getting facility names: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Return empty array on error, facility IDs will be used as fallback (Requirement: 8.1)
      return [];
    }
  }
  
  /**
   * Fall back to manual entry when carryforward fails
   * 
   * This method retrieves manual entry as fallback when carryforward fails,
   * generates appropriate warning messages, and returns CarryforwardResult
   * with FALLBACK source.
   * 
   * Requirements: 1.3, 8.1, 8.2
   * 
   * @param options Carryforward options
   * @param reason Reason for fallback
   * @returns CarryforwardResult with fallback data
   */
  private async fallbackToManualEntry(
    options: CarryforwardOptions,
    reason: string
  ): Promise<CarryforwardResult> {
    this.logger.warn(`Falling back to manual entry for period ${options.reportingPeriodId}: ${reason}`);
    
    try {
      // Step 1: Attempt to retrieve manual entry as fallback (Requirement: 1.3, 8.1)
      const manualEntryResult = await this.getManualBeginningCash(
        options.reportingPeriodId,
        options.facilityId,
        options.projectType
      );
      
      const manualEntry = manualEntryResult.amount;
      const overrideReason = manualEntryResult.reason;
      
      this.logger.debug(`Manual entry fallback amount: ${manualEntry}` + (overrideReason ? `, reason: ${overrideReason}` : ''));
      
      // Step 2: Generate appropriate warning message (Requirement: 8.2)
      const warnings: string[] = [];
      
      // Primary warning about the fallback
      warnings.push(`Carryforward failed: ${reason}. ${manualEntry > 0 ? 'Using manual entry.' : 'No manual entry available, defaulting to zero.'}`);
      
      // Additional context if manual entry exists
      if (manualEntry > 0) {
        if (overrideReason) {
          warnings.push(`Manual entry reason: ${overrideReason}`);
        }
        
        this.logger.info(
          `Successfully fell back to manual entry: ${manualEntry} for period ${options.reportingPeriodId}`
        );
      } else {
        this.logger.warn(
          `No manual entry available for fallback, using zero for period ${options.reportingPeriodId}`
        );
      }
      
      // Step 3: Return CarryforwardResult with FALLBACK source (Requirement: 8.2)
      return {
        success: manualEntry > 0, // Success if we found a manual entry
        beginningCash: manualEntry,
        source: 'FALLBACK',
        metadata: {
          error: reason,
          manualEntryAmount: manualEntry > 0 ? manualEntry : undefined,
          overrideReason: overrideReason,
          timestamp: new Date().toISOString()
        },
        warnings
      };
      
    } catch (error) {
      // Handle errors in fallback logic (Requirement: 8.1, 8.2)
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(
        `Error in fallback to manual entry for period ${options.reportingPeriodId}: ${errorMessage}`
      );
      
      // Return final fallback with zero amount
      return {
        success: false,
        beginningCash: 0,
        source: 'FALLBACK',
        metadata: {
          error: `${reason}. Additionally, fallback to manual entry failed: ${errorMessage}`,
          timestamp: new Date().toISOString()
        },
        warnings: [
          `Carryforward failed: ${reason}`,
          `Fallback to manual entry also failed: ${errorMessage}`,
          'Beginning cash defaulted to zero.'
        ]
      };
    }
  }
  
  /**
   * Handle errors during carryforward operations
   * 
   * @param error Error object
   * @param options Carryforward options
   * @returns CarryforwardResult with error information
   */
  private handleError(error: any, _options: CarryforwardOptions): CarryforwardResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.logger.error(`Carryforward error: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`);
    
    return {
      success: false,
      beginningCash: 0,
      source: 'FALLBACK',
      metadata: {
        error: `Carryforward failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      },
      warnings: [`Unable to retrieve previous period data: ${errorMessage}`]
    };
  }
}

// ============================================================================
// CARRYFORWARD VALIDATOR
// ============================================================================

/**
 * Validation result for carryforward operations
 */
export interface CarryforwardValidationResult {
  /** Whether the carryforward is valid (no critical issues) */
  isValid: boolean;
  
  /** Array of warning messages */
  warnings: string[];
}

/**
 * Validator for carryforward operations
 * 
 * This class provides validation logic for carryforward operations,
 * including discrepancy detection and edge case warnings.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class CarryforwardValidator {
  private logger = createServiceLogger('CarryforwardValidator');
  
  /** Tolerance for floating point comparison (Requirement: 5.5) */
  private readonly TOLERANCE = 0.01;
  
  /** Threshold for unusually large beginning cash balance (Requirement: 5.3) */
  private readonly LARGE_BALANCE_THRESHOLD = 1000000;
  
  /**
   * Validate carryforward consistency and generate warnings
   * 
   * This method performs comprehensive validation of carryforward operations,
   * checking for discrepancies, edge cases, and potential data issues.
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * @param carryforwardAmount Amount carried forward from previous period
   * @param manualEntryAmount Manual entry amount (if exists)
   * @param previousPeriodId Previous period ID (if found)
   * @param overrideReason Optional reason for manual override
   * @returns Validation result with warnings
   */
  validateCarryforward(
    carryforwardAmount: number,
    manualEntryAmount: number,
    previousPeriodId: number | undefined,
    overrideReason?: string
  ): CarryforwardValidationResult {
    this.logger.debug(
      `Validating carryforward: carryforward=${carryforwardAmount}, ` +
      `manual=${manualEntryAmount}, previousPeriod=${previousPeriodId}`
    );
    
    const warnings: string[] = [];
    
    // Validation 1: No previous period found (Requirement: 5.1)
    if (!previousPeriodId) {
      warnings.push(
        'No previous period statement found. Beginning cash is based on manual entry or defaults to zero.'
      );
      this.logger.warn('No previous period found during validation');
    }
    
    // Validation 2: Discrepancy between carryforward and manual entry (Requirements: 5.4, 5.5)
    if (carryforwardAmount > 0 && manualEntryAmount > 0) {
      const difference = Math.abs(carryforwardAmount - manualEntryAmount);
      
      if (difference > this.TOLERANCE) {
        const warningMessage = 
          `Beginning cash discrepancy detected: ` +
          `Previous period ending cash (${carryforwardAmount.toFixed(2)}) ` +
          `differs from manual entry (${manualEntryAmount.toFixed(2)}) ` +
          `by ${difference.toFixed(2)}. Using manual entry value.` +
          (overrideReason ? ` Reason: ${overrideReason}` : '');
        
        warnings.push(warningMessage);
        this.logger.warn(`Discrepancy detected: ${difference.toFixed(2)}`);
      }
    }
    
    // Validation 3: Previous period ending cash is zero (Requirement: 5.3)
    if (previousPeriodId && carryforwardAmount === 0 && manualEntryAmount === 0) {
      warnings.push(
        'Previous period ending cash is zero. This may indicate missing data or a new account.'
      );
      // Reduced logging: Use debug level for zero cash
      this.logger.debug('Previous period ending cash is zero');
    }
    
    // Validation 4: Large beginning cash balance (Requirement: 5.3)
    const effectiveAmount = manualEntryAmount > 0 ? manualEntryAmount : carryforwardAmount;
    if (effectiveAmount > this.LARGE_BALANCE_THRESHOLD) {
      warnings.push(
        `Large beginning cash balance detected (${effectiveAmount.toFixed(2)}). ` +
        `Please verify this is correct.`
      );
      this.logger.warn(`Large balance detected: ${effectiveAmount.toFixed(2)}`);
    }
    
    // Validation 5: Negative balance (edge case)
    if (effectiveAmount < 0) {
      warnings.push(
        `Negative beginning cash balance detected (${effectiveAmount.toFixed(2)}). ` +
        `This may indicate a data error.`
      );
      this.logger.warn(`Negative balance detected: ${effectiveAmount.toFixed(2)}`);
    }
    
    const isValid = warnings.length === 0;
    
    this.logger.debug(
      `Validation complete: isValid=${isValid}, warnings=${warnings.length}`
    );
    
    return {
      isValid,
      warnings
    };
  }
  
  /**
   * Detect and calculate discrepancy between carryforward and manual entry
   * 
   * This method specifically focuses on discrepancy detection and calculation,
   * providing detailed information about differences between carryforward
   * and manual entry amounts.
   * 
   * Requirements: 5.4, 5.5
   * 
   * @param carryforwardAmount Amount carried forward from previous period
   * @param manualEntryAmount Manual entry amount
   * @returns Object with discrepancy information
   */
  detectDiscrepancy(
    carryforwardAmount: number,
    manualEntryAmount: number
  ): {
    hasDiscrepancy: boolean;
    difference: number;
    percentageDifference: number;
    exceedsTolerance: boolean;
  } {
    this.logger.debug(
      `Detecting discrepancy: carryforward=${carryforwardAmount}, manual=${manualEntryAmount}`
    );
    
    // Calculate absolute difference
    const difference = Math.abs(carryforwardAmount - manualEntryAmount);
    
    // Calculate percentage difference (avoid division by zero)
    const base = carryforwardAmount !== 0 ? carryforwardAmount : manualEntryAmount;
    const percentageDifference = base !== 0 ? (difference / Math.abs(base)) * 100 : 0;
    
    // Check if difference exceeds tolerance
    const exceedsTolerance = difference > this.TOLERANCE;
    
    // Discrepancy exists if both amounts are non-zero and differ beyond tolerance
    const hasDiscrepancy = 
      carryforwardAmount > 0 && 
      manualEntryAmount > 0 && 
      exceedsTolerance;
    
    this.logger.debug(
      `Discrepancy detection result: hasDiscrepancy=${hasDiscrepancy}, ` +
      `difference=${difference.toFixed(2)}, ` +
      `percentageDifference=${percentageDifference.toFixed(2)}%`
    );
    
    return {
      hasDiscrepancy,
      difference,
      percentageDifference,
      exceedsTolerance
    };
  }
  
  /**
   * Generate warning message for discrepancy
   * 
   * This method generates a formatted warning message when a discrepancy
   * is detected between carryforward and manual entry amounts.
   * 
   * Requirements: 5.4, 5.5
   * 
   * @param carryforwardAmount Amount carried forward from previous period
   * @param manualEntryAmount Manual entry amount
   * @param overrideReason Optional reason for manual override
   * @returns Warning message
   */
  generateDiscrepancyWarning(
    carryforwardAmount: number,
    manualEntryAmount: number,
    overrideReason?: string
  ): string {
    const difference = Math.abs(carryforwardAmount - manualEntryAmount);
    
    let warning = 
      `Beginning cash discrepancy detected: ` +
      `Previous period ending cash (${carryforwardAmount.toFixed(2)}) ` +
      `differs from manual entry (${manualEntryAmount.toFixed(2)}) ` +
      `by ${difference.toFixed(2)}. Using manual entry value.`;
    
    if (overrideReason) {
      warning += ` Reason: ${overrideReason}`;
    }
    
    return warning;
  }
  
  /**
   * Validate edge cases and generate appropriate warnings
   * 
   * This method checks for various edge cases that may indicate
   * data issues or special circumstances.
   * 
   * Requirements: 5.1, 5.3
   * 
   * @param carryforwardAmount Amount carried forward from previous period
   * @param manualEntryAmount Manual entry amount
   * @param previousPeriodId Previous period ID (if found)
   * @returns Array of warning messages for edge cases
   */
  validateEdgeCases(
    carryforwardAmount: number,
    manualEntryAmount: number,
    previousPeriodId: number | undefined
  ): string[] {
    this.logger.debug('Validating edge cases');
    
    const warnings: string[] = [];
    
    // Edge Case 1: No previous period found (Requirement: 5.1)
    if (!previousPeriodId) {
      warnings.push(
        'No previous period statement found. Beginning cash is based on manual entry or defaults to zero.'
      );
      this.logger.debug('Edge case: No previous period');
    }
    
    // Edge Case 2: Previous ending cash is zero (Requirement: 5.3)
    if (previousPeriodId && carryforwardAmount === 0 && manualEntryAmount === 0) {
      warnings.push(
        'Previous period ending cash is zero. This may indicate missing data or a new account.'
      );
      this.logger.debug('Edge case: Zero ending cash');
    }
    
    // Edge Case 3: Unusually large beginning cash (Requirement: 5.3)
    const effectiveAmount = manualEntryAmount > 0 ? manualEntryAmount : carryforwardAmount;
    if (effectiveAmount > this.LARGE_BALANCE_THRESHOLD) {
      warnings.push(
        `Large beginning cash balance detected (${effectiveAmount.toFixed(2)}). ` +
        `Please verify this is correct.`
      );
      this.logger.debug(`Edge case: Large balance ${effectiveAmount.toFixed(2)}`);
    }
    
    // Edge Case 4: Negative balance
    if (effectiveAmount < 0) {
      warnings.push(
        `Negative beginning cash balance detected (${effectiveAmount.toFixed(2)}). ` +
        `This may indicate a data error.`
      );
      this.logger.debug(`Edge case: Negative balance ${effectiveAmount.toFixed(2)}`);
    }
    
    // Edge Case 5: Both carryforward and manual entry are zero
    if (carryforwardAmount === 0 && manualEntryAmount === 0 && previousPeriodId) {
      warnings.push(
        'Beginning cash is zero. This may be correct for a new account or indicate missing data.'
      );
      this.logger.debug('Edge case: Both amounts are zero');
    }
    
    this.logger.debug(`Edge case validation complete: ${warnings.length} warnings`);
    
    return warnings;
  }
}
