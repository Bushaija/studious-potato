import type { 
  BudgetVsActualLine, 
  BudgetVsActualStatement, 
  BudgetVsActualMapping 
} from './financial-reports.types';
import { CustomEventMapper, DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS } from './custom-event-mapper';
import type { 
  StatementTemplate, 
  TemplateLine 
} from '@/lib/statement-engine/types/core.types';

// Types for aggregated event data (matching existing system)
interface AggregatedEventData {
  eventTotals: Map<string, number>;
  facilityTotals: Map<number, number>;
  periodTotals: Map<number, number>;
  metadata: {
    totalEvents: number;
    totalFacilities: number;
    totalAmount: number;
    aggregationMethod: string;
    processingTime: number;
  };
}

// Using existing StatementTemplate and TemplateLine types from core.types

interface GenerationOptions {
  facilityId?: number;
  reportingPeriodId: number;
  projectType: string;
  customMappings?: Record<string, any>;
}

interface PeriodInfo {
  id: number;
  year: number;
  type: string;
  startDate: string;
  endDate: string;
}

interface FacilityInfo {
  id: number;
  name: string;
  type: string;
  district?: string;
}

// Validation interfaces
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

interface ValidationError {
  type: 'MISSING_EVENT' | 'INVALID_TEMPLATE' | 'DATA_INTEGRITY';
  message: string;
  context: {
    lineCode?: string;
    eventCode?: string;
    templateSection?: string;
  };
}

interface ValidationWarning {
  type: 'MISSING_DATA' | 'ZERO_VALUES' | 'MAPPING_FALLBACK';
  message: string;
  context: {
    lineCode?: string;
    eventCode?: string;
    amount?: number;
  };
}

interface ValidationSummary {
  totalChecks: number;
  passedChecks: number;
  criticalErrors: number;
  warnings: number;
  overallStatus: 'VALID' | 'INVALID';
}

/**
 * BudgetVsActualValidator handles comprehensive validation for Budget vs Actual statements
 */
class BudgetVsActualValidator {
  private eventMapper: CustomEventMapper;

  constructor(eventMapper: CustomEventMapper) {
    this.eventMapper = eventMapper;
  }

  /**
   * Validate Budget vs Actual statement generation requirements
   * @param template - Statement template
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @param availableEventCodes - All available event codes from database
   * @returns Comprehensive validation result
   */
  validateStatementGeneration(
    template: StatementTemplate,
    planningData: AggregatedEventData,
    executionData: AggregatedEventData,
    availableEventCodes: Set<string>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // 1. Validate template configuration
    const templateValidation = this.validateTemplateConfiguration(template);
    totalChecks += templateValidation.totalChecks;
    passedChecks += templateValidation.passedChecks;
    errors.push(...templateValidation.errors);
    warnings.push(...templateValidation.warnings);

    // 2. Validate event existence in database
    const eventExistenceValidation = this.validateEventExistence(availableEventCodes);
    totalChecks += eventExistenceValidation.totalChecks;
    passedChecks += eventExistenceValidation.passedChecks;
    errors.push(...eventExistenceValidation.errors);
    warnings.push(...eventExistenceValidation.warnings);

    // 3. Validate data availability
    const dataValidation = this.validateDataAvailability(
      template,
      planningData.eventTotals,
      executionData.eventTotals
    );
    totalChecks += dataValidation.totalChecks;
    passedChecks += dataValidation.passedChecks;
    errors.push(...dataValidation.errors);
    warnings.push(...dataValidation.warnings);

    // 4. Validate event mappings
    const mappingValidation = this.validateEventMappings(
      planningData.eventTotals,
      executionData.eventTotals
    );
    totalChecks += mappingValidation.totalChecks;
    passedChecks += mappingValidation.passedChecks;
    errors.push(...mappingValidation.errors);
    warnings.push(...mappingValidation.warnings);

    const criticalErrors = errors.filter(e => 
      e.type === 'MISSING_EVENT' || e.type === 'INVALID_TEMPLATE'
    ).length;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalChecks,
        passedChecks,
        criticalErrors,
        warnings: warnings.length,
        overallStatus: errors.length === 0 ? 'VALID' : 'INVALID'
      }
    };
  }

  /**
   * Validate template configuration for Budget vs Actual
   */
  private validateTemplateConfiguration(template: StatementTemplate): {
    totalChecks: number;
    passedChecks: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Check if template has required sections
    const requiredSections = ['RECEIPTS_HEADER', 'EXPENDITURES_HEADER'];
    for (const sectionCode of requiredSections) {
      totalChecks++;
      const hasSection = template.lines.some(line => line.lineCode === sectionCode);
      if (hasSection) {
        passedChecks++;
      } else {
        errors.push({
          type: 'INVALID_TEMPLATE',
          message: `Missing required section: ${sectionCode}`,
          context: { templateSection: sectionCode }
        });
      }
    }

    // Check for required computed lines
    const requiredComputedLines = ['TOTAL_RECEIPTS', 'TOTAL_EXPENDITURES', 'NET_LENDING_BORROWING'];
    for (const lineCode of requiredComputedLines) {
      totalChecks++;
      const hasComputedLine = template.lines.some(line => 
        line.lineCode === lineCode && line.calculationFormula
      );
      if (hasComputedLine) {
        passedChecks++;
      } else {
        warnings.push({
          type: 'MISSING_DATA',
          message: `Missing computed line: ${lineCode}`,
          context: { lineCode }
        });
      }
    }

    // Validate display order consistency
    totalChecks++;
    const displayOrders = template.lines.map(line => line.displayOrder);
    const hasDuplicateOrders = displayOrders.length !== new Set(displayOrders).size;
    if (!hasDuplicateOrders) {
      passedChecks++;
    } else {
      errors.push({
        type: 'INVALID_TEMPLATE',
        message: 'Template has duplicate display orders',
        context: { templateSection: 'displayOrder' }
      });
    }

    return { totalChecks, passedChecks, errors, warnings };
  }

  /**
   * Validate that required events exist in database
   */
  private validateEventExistence(availableEventCodes: Set<string>): {
    totalChecks: number;
    passedChecks: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Get all event codes used in mappings
    const allMappings = this.eventMapper.getAllMappings();
    const requiredEventCodes = new Set<string>();

    for (const mapping of allMappings) {
      mapping.budgetEvents.forEach(code => requiredEventCodes.add(code));
      mapping.actualEvents.forEach(code => requiredEventCodes.add(code));
    }

    // Check each required event code
    for (const eventCode of requiredEventCodes) {
      totalChecks++;
      if (availableEventCodes.has(eventCode)) {
        passedChecks++;
      } else {
        errors.push({
          type: 'MISSING_EVENT',
          message: `Required event code '${eventCode}' does not exist in database`,
          context: { eventCode }
        });
      }
    }

    // Check for critical planning events
    const criticalPlanningEvents = ['GOODS_SERVICES_PLANNING'];
    for (const eventCode of criticalPlanningEvents) {
      totalChecks++;
      if (availableEventCodes.has(eventCode)) {
        passedChecks++;
      } else {
        errors.push({
          type: 'MISSING_EVENT',
          message: `Critical planning event '${eventCode}' missing from database`,
          context: { eventCode }
        });
      }
    }

    return { totalChecks, passedChecks, errors, warnings };
  }

  /**
   * Validate data availability for statement generation
   */
  private validateDataAvailability(
    template: StatementTemplate,
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): {
    totalChecks: number;
    passedChecks: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Check data availability for each template line
    for (const templateLine of template.lines) {
      if (templateLine.calculationFormula) {
        // Skip computed lines - they don't need direct event data
        continue;
      }

      const customMapping = this.eventMapper.getEventMapping(templateLine.lineCode);
      
      if (customMapping) {
        // Check custom mapping data availability
        totalChecks++;
        let hasData = false;

        // Check budget events in planning data
        for (const eventCode of customMapping.budgetEvents) {
          if (planningData.has(eventCode) && (planningData.get(eventCode) || 0) !== 0) {
            hasData = true;
            break;
          }
        }

        // Check actual events in execution data
        for (const eventCode of customMapping.actualEvents) {
          if (executionData.has(eventCode) && (executionData.get(eventCode) || 0) !== 0) {
            hasData = true;
            break;
          }
        }

        if (hasData) {
          passedChecks++;
        } else {
          warnings.push({
            type: 'MISSING_DATA',
            message: `No data available for line '${templateLine.lineCode}' with custom mapping`,
            context: { lineCode: templateLine.lineCode }
          });
        }
      } else if (templateLine.eventMappings && templateLine.eventMappings.length > 0) {
        // Check standard event mapping data availability
        totalChecks++;
        let hasData = false;

        for (const eventCode of templateLine.eventMappings) {
          const planningAmount = planningData.get(`${eventCode}_PLANNING`) || planningData.get(eventCode) || 0;
          const executionAmount = executionData.get(eventCode) || 0;
          
          if (planningAmount !== 0 || executionAmount !== 0) {
            hasData = true;
            break;
          }
        }

        if (hasData) {
          passedChecks++;
        } else {
          warnings.push({
            type: 'MISSING_DATA',
            message: `No data available for line '${templateLine.lineCode}'`,
            context: { lineCode: templateLine.lineCode }
          });
        }
      }
    }

    return { totalChecks, passedChecks, errors, warnings };
  }

  /**
   * Validate event mappings configuration
   */
  private validateEventMappings(
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): {
    totalChecks: number;
    passedChecks: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 1;
    let passedChecks = 0;

    // Use existing validation from CustomEventMapper
    const mappingValidation = this.eventMapper.validateMappings(planningData, executionData);
    
    if (mappingValidation.isValid) {
      passedChecks++;
    } else {
      for (const missingEvent of mappingValidation.missingEvents) {
        errors.push({
          type: 'MISSING_EVENT',
          message: missingEvent,
          context: {}
        });
      }
    }

    // Add warnings from mapping validation
    for (const warning of mappingValidation.warnings) {
      warnings.push({
        type: 'MAPPING_FALLBACK',
        message: warning,
        context: {}
      });
    }

    return { totalChecks, passedChecks, errors, warnings };
  }
}

/**
 * BudgetVsActualProcessor handles the specialized logic for generating
 * Budget vs Actual statements with four+ column structure
 */
export class BudgetVsActualProcessor {
  private eventMapper: CustomEventMapper;
  private validator: BudgetVsActualValidator;

  constructor(customMappings: BudgetVsActualMapping[] = []) {
    // Combine default mappings with any custom ones
    const allMappings = [...DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS, ...customMappings];
    this.eventMapper = new CustomEventMapper(allMappings);
    this.validator = new BudgetVsActualValidator(this.eventMapper);
  }

  /**
   * Generate a complete Budget vs Actual statement
   * @param template - The statement template configuration
   * @param planningData - Aggregated planning/budget data
   * @param executionData - Aggregated execution/actual data
   * @param options - Generation options
   * @param reportingPeriod - Reporting period information
   * @param facility - Optional facility information
   * @param availableEventCodes - Set of all available event codes from database
   * @returns Complete Budget vs Actual statement
   */
  async generateStatement(
    template: StatementTemplate,
    planningData: AggregatedEventData,
    executionData: AggregatedEventData,
    options: GenerationOptions,
    reportingPeriod: PeriodInfo,
    facility?: FacilityInfo,
    availableEventCodes?: Set<string>
  ): Promise<BudgetVsActualStatement> {
    const startTime = Date.now();
    
    // Comprehensive validation if event codes are provided
    let validationResult: ValidationResult | null = null;
    if (availableEventCodes) {
      validationResult = this.validator.validateStatementGeneration(
        template,
        planningData,
        executionData,
        availableEventCodes
      );
    }

    // Legacy validation fallback
    const legacyValidation = this.eventMapper.validateMappings(
      planningData.eventTotals,
      executionData.eventTotals
    );

    const warnings: string[] = validationResult ? 
      validationResult.warnings.map(w => w.message) : 
      [...legacyValidation.warnings];
    
    if (!legacyValidation.isValid) {
      warnings.push(...legacyValidation.missingEvents.map(event => `Missing event data: ${event}`));
    }

    // Check for missing data and handle gracefully
    const dataAvailability = this.handleMissingData(planningData, executionData);
    warnings.push(...dataAvailability.warnings);

    if (!dataAvailability.canProceed) {
      throw new Error('Cannot proceed with statement generation due to critical data issues');
    }

    // Process all template lines with comprehensive error handling
    const lines: BudgetVsActualLine[] = [];
    const totals: Record<string, { budget: number; actual: number; variance: number }> = {};
    const processingErrors: string[] = [];

    for (const templateLine of template.lines) {
      try {
        const line = await this.processLine(
          templateLine,
          planningData.eventTotals,
          executionData.eventTotals,
          lines // Pass existing lines for computed calculations
        );
        
        lines.push(line);

        // Track totals for total and subtotal lines
        if (templateLine.formatting?.isTotal || templateLine.formatting?.isSubtotal) {
          totals[templateLine.lineCode] = {
            budget: this.sanitizeAmount(line.revisedBudget, `${templateLine.lineCode}_total_budget`),
            actual: this.sanitizeAmount(line.actual, `${templateLine.lineCode}_total_actual`),
            variance: this.sanitizeAmount(line.variance, `${templateLine.lineCode}_total_variance`)
          };
        }
      } catch (error) {
        const errorContext = this.getErrorContext(error, {
          lineCode: templateLine.lineCode,
          description: templateLine.description,
          displayOrder: templateLine.displayOrder
        });
        
        console.error(`[BudgetVsActualProcessor] Failed to process line ${templateLine.lineCode}:`, errorContext);
        processingErrors.push(`Failed to process line ${templateLine.lineCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Add fallback line to prevent complete failure
        const fallbackLine = this.createFallbackLine(templateLine, error instanceof Error ? error.message : 'Unknown error');
        lines.push(fallbackLine);
      }
    }

    // Add processing errors to warnings
    warnings.push(...processingErrors);

    // Sort lines by display order with error handling
    try {
      lines.sort((a, b) => {
        const orderA = a.metadata.displayOrder || 999;
        const orderB = b.metadata.displayOrder || 999;
        return orderA - orderB;
      });
    } catch (error) {
      console.error('[BudgetVsActualProcessor] Error sorting lines by display order:', error);
      warnings.push('Failed to sort lines by display order - order may be incorrect');
    }

    const processingTime = Date.now() - startTime;

    return {
      statementCode: 'BUDGET_VS_ACTUAL',
      statementName: template.statementName,
      reportingPeriod,
      facility,
      generatedAt: new Date().toISOString(),
      lines,
      totals,
      metadata: {
        templateVersion: '1.0',
        calculationFormulas: this.extractCalculationFormulas(template.lines),
        validationResults: validationResult ? {
          totalRules: validationResult.summary.totalChecks,
          passedRules: validationResult.summary.passedChecks,
          failedRules: validationResult.summary.totalChecks - validationResult.summary.passedChecks,
          warningCount: validationResult.summary.warnings,
          errorCount: validationResult.summary.criticalErrors
        } : {
          totalRules: 1,
          passedRules: legacyValidation.isValid ? 1 : 0,
          failedRules: legacyValidation.isValid ? 0 : 1,
          warningCount: warnings.length,
          errorCount: legacyValidation.missingEvents.length
        },
        footnotes: this.extractFootnotes(template.lines),
        customEventMappings: this.eventMapper.getAllMappings()
      }
    };
  }

  /**
   * Process a single template line into a Budget vs Actual line with comprehensive error handling
   * @param templateLine - The template line configuration
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @param existingLines - Previously processed lines (for computed calculations)
   * @returns Processed Budget vs Actual line
   */
  private async processLine(
    templateLine: TemplateLine,
    planningData: Map<string, number>,
    executionData: Map<string, number>,
    existingLines: BudgetVsActualLine[]
  ): Promise<BudgetVsActualLine> {
    let budgetAmount = 0;
    let actualAmount = 0;
    const warnings: string[] = [];

    try {
      // Validate template line
      if (!templateLine || !templateLine.lineCode) {
        console.error('[BudgetVsActualProcessor] Invalid template line:', templateLine);
        throw new Error(`Invalid template line: missing lineCode`);
      }

      // Check if this line has a custom mapping (from constructor or template metadata)
      let customMapping = this.eventMapper.getEventMapping(templateLine.lineCode);
      
      // If no mapping from constructor, check template line metadata
      if (!customMapping && templateLine.metadata?.budgetVsActualMapping) {
        const metadataMapping = templateLine.metadata.budgetVsActualMapping;
        customMapping = {
          lineCode: templateLine.lineCode,
          budgetEvents: metadataMapping.budgetEvents || [],
          actualEvents: metadataMapping.actualEvents || [],
          note: metadataMapping.note
        };
      }

      if (customMapping) {
        try {
          // Use custom event mapping with error handling
          const result = this.eventMapper.applyMappingWithErrorHandling(
            customMapping,
            planningData,
            executionData,
            (warning) => console.warn(`[BudgetVsActualProcessor] ${warning}`)
          );
          budgetAmount = this.sanitizeAmount(result.budgetAmount, `${templateLine.lineCode}_budget`);
          actualAmount = this.sanitizeAmount(result.actualAmount, `${templateLine.lineCode}_actual`);
          warnings.push(...result.warnings);
        } catch (error) {
          console.error(`[BudgetVsActualProcessor] Error applying custom mapping for ${templateLine.lineCode}:`, error);
          warnings.push(`Failed to apply custom mapping for ${templateLine.lineCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with zero values rather than failing
        }
      } else if (templateLine.calculationFormula) {
        try {
          // Handle computed lines (totals, subtotals, etc.)
          const computedResult = this.calculateComputedLineWithErrorHandling(
            templateLine,
            existingLines,
            planningData,
            executionData
          );
          budgetAmount = this.sanitizeAmount(computedResult.budgetAmount, `${templateLine.lineCode}_computed_budget`);
          actualAmount = this.sanitizeAmount(computedResult.actualAmount, `${templateLine.lineCode}_computed_actual`);
          warnings.push(...computedResult.warnings);
        } catch (error) {
          console.error(`[BudgetVsActualProcessor] Error calculating computed line ${templateLine.lineCode}:`, error);
          warnings.push(`Failed to calculate computed line ${templateLine.lineCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with zero values rather than failing
        }
      } else if (templateLine.eventMappings && templateLine.eventMappings.length > 0) {
        try {
          // Use standard event mapping (fallback)
          const fallbackMapping = this.eventMapper.getFallbackMapping(
            templateLine.lineCode,
            templateLine.eventMappings
          );
          const result = this.eventMapper.applyMappingWithErrorHandling(
            fallbackMapping,
            planningData,
            executionData,
            (warning) => console.warn(`[BudgetVsActualProcessor] ${warning}`)
          );
          budgetAmount = this.sanitizeAmount(result.budgetAmount, `${templateLine.lineCode}_fallback_budget`);
          actualAmount = this.sanitizeAmount(result.actualAmount, `${templateLine.lineCode}_fallback_actual`);
          warnings.push(...result.warnings);
        } catch (error) {
          console.error(`[BudgetVsActualProcessor] Error applying fallback mapping for ${templateLine.lineCode}:`, error);
          warnings.push(`Failed to apply fallback mapping for ${templateLine.lineCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with zero values rather than failing
        }
      }
      // If no event codes and no formula, amounts remain 0 (header lines, etc.)

      // Calculate variance with error handling
      const variance = this.calculateVarianceWithErrorHandling(budgetAmount, actualAmount, templateLine.lineCode);
      
      // Calculate performance percentage with error handling
      const performancePercentage = this.calculatePerformancePercentage(actualAmount, budgetAmount);

      return this.formatBudgetVsActualLine(
        templateLine,
        budgetAmount,
        actualAmount,
        variance,
        performancePercentage
      );
    } catch (error) {
      console.error(`[BudgetVsActualProcessor] Critical error processing line ${templateLine?.lineCode || 'unknown'}:`, error);
      
      // Return a safe fallback line to prevent complete failure
      return this.createFallbackLine(templateLine, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process lines with custom event mappings
   * @param mapping - Custom mapping configuration
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @returns Budget and actual amounts
   */
  processLineWithCustomMapping(
    mapping: BudgetVsActualMapping,
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): { budgetAmount: number; actualAmount: number } {
    return this.eventMapper.applyMapping(mapping, planningData, executionData);
  }

  /**
   * Calculate performance percentage with safe division and comprehensive error handling
   * @param actual - Actual amount
   * @param budget - Budget amount
   * @returns Performance percentage or undefined if budget is zero
   */
  calculatePerformancePercentage(actual: number, budget: number): number | undefined {
    try {
      // Handle null, undefined, or NaN values
      if (actual == null || budget == null || isNaN(actual) || isNaN(budget)) {
        console.warn('[BudgetVsActualProcessor] Invalid values for performance calculation:', { actual, budget });
        return undefined;
      }

      // Handle division by zero
      if (budget === 0) {
        if (actual !== 0) {
          console.warn('[BudgetVsActualProcessor] Division by zero: budget is 0 but actual is not 0:', { actual, budget });
        }
        return undefined; // Will display as "-" in UI
      }

      const percentage = (actual / budget) * 100;

      // Handle extreme values
      if (!isFinite(percentage)) {
        console.warn('[BudgetVsActualProcessor] Performance percentage calculation resulted in non-finite value:', { actual, budget, percentage });
        return undefined;
      }

      return percentage;
    } catch (error) {
      console.error('[BudgetVsActualProcessor] Error calculating performance percentage:', error, { actual, budget });
      return undefined;
    }
  }

  /**
   * Format a Budget vs Actual line with proper structure
   * @param templateLine - Template line configuration
   * @param budgetAmount - Budget amount
   * @param actualAmount - Actual amount
   * @param variance - Variance amount
   * @param performancePercentage - Performance percentage
   * @returns Formatted Budget vs Actual line
   */
  formatBudgetVsActualLine(
    templateLine: TemplateLine,
    budgetAmount: number,
    actualAmount: number,
    variance: number,
    performancePercentage?: number
  ): BudgetVsActualLine {
    return {
      id: `BUDGET_VS_ACTUAL_${templateLine.lineCode}`,
      description: templateLine.description,
      note: undefined, // Note numbers will be handled separately
      revisedBudget: budgetAmount,
      actual: actualAmount,
      variance,
      performancePercentage,
      formatting: {
        bold: templateLine.formatting?.bold || templateLine.formatting?.isTotal || templateLine.formatting?.isSubtotal || false,
        italic: templateLine.formatting?.italic || false,
        indentLevel: Math.max(0, Math.min(5, templateLine.formatting?.indentLevel || 0)),
        isSection: templateLine.formatting?.isSection || false,
        isSubtotal: templateLine.formatting?.isSubtotal || false,
        isTotal: templateLine.formatting?.isTotal || false,
      },
      metadata: {
        lineCode: templateLine.lineCode,
        eventCodes: templateLine.eventMappings || [],
        formula: templateLine.calculationFormula,
        isComputed: !!templateLine.calculationFormula,
        displayOrder: templateLine.displayOrder,
      }
    };
  }

  /**
   * Calculate computed lines (totals, subtotals, derived values)
   * @param templateLine - Template line with calculation formula
   * @param existingLines - Previously processed lines
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @returns Computed budget and actual amounts
   */
  private calculateComputedLine(
    templateLine: TemplateLine,
    existingLines: BudgetVsActualLine[],
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): { budgetAmount: number; actualAmount: number } {
    // For now, implement basic total calculations
    // This can be extended with a proper formula engine later
    
    if (templateLine.lineCode === 'TOTAL_RECEIPTS') {
      return this.calculateReceiptsTotal(existingLines);
    } else if (templateLine.lineCode === 'TOTAL_EXPENDITURES') {
      return this.calculateExpendituresTotal(existingLines);
    } else if (templateLine.lineCode === 'NET_LENDING_BORROWING') {
      return this.calculateNetLendingBorrowing(existingLines);
    }

    // Default: return zero for unknown computed lines
    return { budgetAmount: 0, actualAmount: 0 };
  }

  /**
   * Calculate total receipts from receipt line items
   */
  private calculateReceiptsTotal(existingLines: BudgetVsActualLine[]): { budgetAmount: number; actualAmount: number } {
    const receiptLineCodes = ['TAX_REVENUE', 'GRANTS', 'OTHER_REVENUE', 'TRANSFERS_PUBLIC'];
    return this.sumLinesByCode(existingLines, receiptLineCodes);
  }

  /**
   * Calculate total expenditures from expenditure line items
   */
  private calculateExpendituresTotal(existingLines: BudgetVsActualLine[]): { budgetAmount: number; actualAmount: number } {
    const expenditureLineCodes = [
      'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'FINANCE_COSTS', 'SUBSIDIES',
      'GRANTS_TRANSFERS', 'SOCIAL_ASSISTANCE', 'OTHER_EXPENSES'
    ];
    return this.sumLinesByCode(existingLines, expenditureLineCodes);
  }

  /**
   * Calculate net lending/borrowing (Receipts - Expenditures - Non-financial assets)
   */
  private calculateNetLendingBorrowing(existingLines: BudgetVsActualLine[]): { budgetAmount: number; actualAmount: number } {
    const receiptsTotal = this.findLineByCode(existingLines, 'TOTAL_RECEIPTS');
    const expendituresTotal = this.findLineByCode(existingLines, 'TOTAL_EXPENDITURES');
    const nonFinancialAssets = this.findLineByCode(existingLines, 'TOTAL_NON_FINANCIAL_ASSETS');

    const budgetAmount = (receiptsTotal?.revisedBudget || 0) - 
                        (expendituresTotal?.revisedBudget || 0) - 
                        (nonFinancialAssets?.revisedBudget || 0);
    
    const actualAmount = (receiptsTotal?.actual || 0) - 
                        (expendituresTotal?.actual || 0) - 
                        (nonFinancialAssets?.actual || 0);

    return { budgetAmount, actualAmount };
  }

  /**
   * Sum amounts from specific line codes
   */
  private sumLinesByCode(lines: BudgetVsActualLine[], lineCodes: string[]): { budgetAmount: number; actualAmount: number } {
    let budgetAmount = 0;
    let actualAmount = 0;

    for (const lineCode of lineCodes) {
      const line = this.findLineByCode(lines, lineCode);
      if (line) {
        budgetAmount += line.revisedBudget;
        actualAmount += line.actual;
      }
    }

    return { budgetAmount, actualAmount };
  }

  /**
   * Find a line by its line code
   */
  private findLineByCode(lines: BudgetVsActualLine[], lineCode: string): BudgetVsActualLine | undefined {
    return lines.find(line => line.metadata.lineCode === lineCode);
  }

  /**
   * Extract calculation formulas from template lines
   */
  private extractCalculationFormulas(lines: TemplateLine[]): Record<string, string> {
    const formulas: Record<string, string> = {};
    for (const line of lines) {
      if (line.calculationFormula) {
        formulas[line.lineCode] = line.calculationFormula;
      }
    }
    return formulas;
  }

  /**
   * Extract footnotes from template lines
   */
  private extractFootnotes(lines: TemplateLine[]): Array<{ number: number; text: string; relatedLines: string[] }> {
    const footnotes: Array<{ number: number; text: string; relatedLines: string[] }> = [];
    // For now, return empty footnotes since the existing TemplateLine doesn't have metadata.note
    // This can be enhanced when note numbers are properly integrated
    return footnotes;
  }

  /**
   * Validate template configuration during statement generation
   * @param template - Statement template to validate
   * @returns Validation result with any configuration issues
   */
  validateTemplateConfiguration(template: StatementTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required sections
    const hasReceiptsHeader = template.lines.some(line => 
      line.lineCode === 'RECEIPTS_HEADER' || line.description.includes('RECEIPTS')
    );
    const hasExpendituresHeader = template.lines.some(line => 
      line.lineCode === 'EXPENDITURES_HEADER' || line.description.includes('EXPENDITURES')
    );

    if (!hasReceiptsHeader) {
      errors.push('Template missing RECEIPTS section header');
    }
    if (!hasExpendituresHeader) {
      errors.push('Template missing EXPENDITURES section header');
    }

    // Check for required computed lines
    const requiredComputedLines = ['TOTAL_RECEIPTS', 'TOTAL_EXPENDITURES'];
    for (const lineCode of requiredComputedLines) {
      const hasComputedLine = template.lines.some(line => 
        line.lineCode === lineCode && line.calculationFormula
      );
      if (!hasComputedLine) {
        warnings.push(`Missing computed line: ${lineCode}`);
      }
    }

    // Validate display order uniqueness
    const displayOrders = template.lines.map(line => line.displayOrder);
    const duplicateOrders = displayOrders.filter((order, index) => 
      displayOrders.indexOf(order) !== index
    );
    if (duplicateOrders.length > 0) {
      errors.push(`Duplicate display orders found: ${duplicateOrders.join(', ')}`);
    }

    // Check for lines with custom mappings
    const customMappingLines = template.lines.filter(line => 
      this.eventMapper.hasCustomMapping(line.lineCode)
    );
    if (customMappingLines.length > 0) {
      warnings.push(`Found ${customMappingLines.length} lines with custom event mappings`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get comprehensive validation results for the statement
   * @param template - Statement template
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @param availableEventCodes - Available event codes from database
   * @returns Detailed validation results
   */
  getValidationResults(
    template: StatementTemplate,
    planningData: AggregatedEventData,
    executionData: AggregatedEventData,
    availableEventCodes: Set<string>
  ): ValidationResult {
    return this.validator.validateStatementGeneration(
      template,
      planningData,
      executionData,
      availableEventCodes
    );
  }

  /**
   * Sanitize amount values to handle null, undefined, NaN, and extreme values
   * @param amount - Amount to sanitize
   * @param context - Context for logging
   * @returns Sanitized amount (defaults to 0 for invalid values)
   */
  private sanitizeAmount(amount: number, context: string): number {
    if (amount == null || isNaN(amount) || !isFinite(amount)) {
      if (amount != null && amount !== 0) {
        console.warn(`[BudgetVsActualProcessor] Invalid amount sanitized to 0 for ${context}:`, amount);
      }
      return 0;
    }
    return amount;
  }

  /**
   * Calculate variance with error handling
   * @param budgetAmount - Budget amount
   * @param actualAmount - Actual amount
   * @param lineCode - Line code for context
   * @returns Variance (budget - actual)
   */
  private calculateVarianceWithErrorHandling(budgetAmount: number, actualAmount: number, lineCode: string): number {
    try {
      const variance = budgetAmount - actualAmount;
      
      if (!isFinite(variance)) {
        console.warn(`[BudgetVsActualProcessor] Variance calculation resulted in non-finite value for ${lineCode}:`, { budgetAmount, actualAmount });
        return 0;
      }
      
      return variance;
    } catch (error) {
      console.error(`[BudgetVsActualProcessor] Error calculating variance for ${lineCode}:`, error, { budgetAmount, actualAmount });
      return 0;
    }
  }

  /**
   * Enhanced computed line calculation with comprehensive error handling
   * @param templateLine - Template line with calculation formula
   * @param existingLines - Previously processed lines
   * @param planningData - Planning event data
   * @param executionData - Execution event data
   * @returns Computed amounts with warnings
   */
  private calculateComputedLineWithErrorHandling(
    templateLine: TemplateLine,
    existingLines: BudgetVsActualLine[],
    planningData: Map<string, number>,
    executionData: Map<string, number>
  ): { budgetAmount: number; actualAmount: number; warnings: string[] } {
    const warnings: string[] = [];
    
    try {
      let result = { budgetAmount: 0, actualAmount: 0 };

      if (templateLine.lineCode === 'TOTAL_RECEIPTS') {
        result = this.calculateReceiptsTotal(existingLines);
      } else if (templateLine.lineCode === 'TOTAL_EXPENDITURES') {
        result = this.calculateExpendituresTotal(existingLines);
      } else if (templateLine.lineCode === 'NET_LENDING_BORROWING') {
        result = this.calculateNetLendingBorrowing(existingLines);
      } else {
        warnings.push(`Unknown computed line type: ${templateLine.lineCode}`);
      }

      // Validate computed results
      if (!isFinite(result.budgetAmount) || !isFinite(result.actualAmount)) {
        warnings.push(`Computed line ${templateLine.lineCode} produced non-finite values`);
        result = { budgetAmount: 0, actualAmount: 0 };
      }

      return { ...result, warnings };
    } catch (error) {
      console.error(`[BudgetVsActualProcessor] Error in computed line calculation for ${templateLine.lineCode}:`, error);
      warnings.push(`Failed to calculate ${templateLine.lineCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { budgetAmount: 0, actualAmount: 0, warnings };
    }
  }

  /**
   * Create a fallback line when processing fails
   * @param templateLine - Original template line
   * @param errorMessage - Error message
   * @returns Safe fallback line with zero values
   */
  private createFallbackLine(templateLine: TemplateLine, errorMessage: string): BudgetVsActualLine {
    console.error(`[BudgetVsActualProcessor] Creating fallback line for ${templateLine?.lineCode || 'unknown'}: ${errorMessage}`);
    
    return {
      id: `BUDGET_VS_ACTUAL_${templateLine?.lineCode || 'ERROR'}`,
      description: templateLine?.description || 'Error processing line',
      note: undefined,
      revisedBudget: 0,
      actual: 0,
      variance: 0,
      performancePercentage: undefined,
      formatting: {
        bold: false,
        italic: true, // Italicize error lines to indicate issues
        indentLevel: 0,
        isSection: false,
        isSubtotal: false,
        isTotal: false,
      },
      metadata: {
        lineCode: templateLine?.lineCode || 'ERROR',
        eventCodes: [],
        formula: undefined,
        isComputed: false,
        displayOrder: templateLine?.displayOrder || 999,
      }
    };
  }

  /**
   * Handle missing planning or execution data gracefully
   * @param planningData - Planning data
   * @param executionData - Execution data
   * @returns Object indicating data availability and warnings
   */
  handleMissingData(
    planningData: AggregatedEventData,
    executionData: AggregatedEventData
  ): { 
    hasPlanningData: boolean; 
    hasExecutionData: boolean; 
    warnings: string[];
    canProceed: boolean;
  } {
    const warnings: string[] = [];
    
    const hasPlanningData = planningData.eventTotals.size > 0 && planningData.metadata.totalAmount > 0;
    const hasExecutionData = executionData.eventTotals.size > 0 && executionData.metadata.totalAmount > 0;

    if (!hasPlanningData) {
      warnings.push('No planning/budget data available - budget columns will show zero values');
    }

    if (!hasExecutionData) {
      warnings.push('No execution/actual data available - actual columns will show zero values');
    }

    // Can proceed even with missing data - just show warnings
    const canProceed = true;

    return {
      hasPlanningData,
      hasExecutionData,
      warnings,
      canProceed
    };
  }

  /**
   * Provide detailed error context for debugging
   * @param error - The error that occurred
   * @param context - Additional context information
   * @returns Formatted error context
   */
  private getErrorContext(error: unknown, context: Record<string, any>): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    
    return `${errorMessage} | Context: ${contextStr}`;
  }
}