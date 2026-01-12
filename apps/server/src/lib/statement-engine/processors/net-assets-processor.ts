/**
 * Net Assets Changes Statement Processor
 * Handles NET_ASSETS statement-specific logic for net asset change tracking
 * and period-over-period net asset change analysis
 */

import { 
  StatementTemplate, 
  StatementLine, 
  ValidationResults,
  BusinessRuleValidation,
  BalanceValidation,
  ColumnType
} from "../types/core.types";
import { EventAggregation } from "../types/engine.types";

export interface NetAssetsCategories {
  beginningNetAssets: {
    unrestricted: number;
    temporarilyRestricted: number;
    permanentlyRestricted: number;
    total: number;
  };
  changes: {
    revenues: number;
    expenses: number;
    netRevenues: number;
    restrictionReleases: number;
    otherChanges: number;
    totalChanges: number;
  };
  endingNetAssets: {
    unrestricted: number;
    temporarilyRestricted: number;
    permanentlyRestricted: number;
    total: number;
  };
}

export class NetAssetsProcessor {
  
  /**
   * Process NET_ASSETS statement with net asset change tracking
   */
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation
  ): {
    lines: StatementLine[];
    categories: NetAssetsCategories;
    validation: ValidationResults;
  } {
    const lines: StatementLine[] = [];
    const categories = this.initializeCategories();
    
    // Process each template line
    for (const templateLine of template.lines) {
      const currentValue = this.calculateLineValue(templateLine, currentPeriodData);
      const previousValue = previousPeriodData 
        ? this.calculateLineValue(templateLine, previousPeriodData)
        : 0;
      
      // Categorize the line value
      this.categorizeLineValue(templateLine, currentValue, categories);
      
      // Determine column type for three-column format
      const columnType = this.getColumnType(templateLine);
      
      // Create statement line with three-column support
      const statementLine: StatementLine = {
        id: `NET_ASSETS_${templateLine.lineCode}`,
        description: templateLine.description,
        
        // Legacy fields (keep for backward compatibility)
        currentPeriodValue: currentValue,
        previousPeriodValue: previousValue,
        
        // Three-column fields: assign value to appropriate column based on columnType
        accumulatedSurplus: columnType === ColumnType.ACCUMULATED ? currentValue : null,
        adjustments: columnType === ColumnType.ADJUSTMENT ? currentValue : null,
        total: columnType === ColumnType.TOTAL ? null : null, // Will be calculated later
        
        variance: this.calculateVariance(currentValue, previousValue),
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting for net assets display
          bold: templateLine.formatting.bold || this.isTotalLine(templateLine.lineCode),
          italic: templateLine.formatting.italic || (currentValue < 0 && this.isChangeItem(templateLine.lineCode))
        },
        metadata: {
          lineCode: templateLine.lineCode,
          eventCodes: templateLine.eventMappings || [],
          formula: templateLine.calculationFormula,
          isComputed: !!templateLine.calculationFormula,
          displayOrder: templateLine.displayOrder,
          columnType: columnType
        }
      };
      
      lines.push(statementLine);
    }
    
    // Calculate totals for TOTAL-type lines
    this.calculateTotalLines(lines);
    
    // Calculate computed totals and net asset changes
    this.calculateComputedTotals(categories);
    
    // Add computed lines for totals and changes
    this.addComputedLines(lines, categories);
    
    // Validate net asset changes and business rules
    const validation = this.validateNetAssets(categories, lines);
    
    return {
      lines: this.sortLinesByDisplayOrder(lines),
      categories,
      validation
    };
  }
  
  /**
   * Calculate line value from event mappings or formula
   */
  private calculateLineValue(templateLine: any, aggregation: EventAggregation): number {
    if (templateLine.calculationFormula) {
      // For now, return 0 for formula lines - these will be handled by FormulaEngine
      return 0;
    }
    
    let total = 0;
    for (const eventCode of templateLine.eventMappings || []) {
      total += aggregation.eventTotals.get(eventCode) || 0;
    }
    
    return total;
  }
  
  /**
   * Determine column type from template line metadata or lineCode
   */
  private getColumnType(templateLine: any): ColumnType {
    // Check metadata first
    if (templateLine.metadata?.columnType) {
      return templateLine.metadata.columnType;
    }
    
    // Fallback: Infer from lineCode
    const lineCode = templateLine.lineCode.toUpperCase();
    
    // Opening balance lines (e.g., "Balances as at 30th June 2023")
    if (lineCode.includes('BALANCES') && lineCode.includes('JUNE') && lineCode.includes('PREV')) {
      return ColumnType.ACCUMULATED;
    }
    
    // Closing balance lines (e.g., "Balance as at 30th June 2024")
    if (lineCode.includes('BALANCE') && lineCode.includes('JUNE') && lineCode.includes('CURRENT')) {
      return ColumnType.TOTAL;
    }
    
    // Carryforward balance lines (e.g., "Balance as at 01st July")
    if (lineCode.includes('BALANCE') && lineCode.includes('JULY')) {
      return ColumnType.ACCUMULATED;
    }
    
    // Period end balance lines
    if (lineCode.includes('BALANCE') && lineCode.includes('PERIOD_END')) {
      return ColumnType.TOTAL;
    }
    
    // Section header lines (e.g., "Prior year adjustments")
    if (lineCode.includes('ADJUSTMENTS') && !lineCode.includes('TOTAL')) {
      return ColumnType.ACCUMULATED;  // Header line shows in accumulated column
    }
    
    // Total/subtotal lines
    if (lineCode.includes('TOTAL') || lineCode.includes('SUBTOTAL')) {
      return ColumnType.TOTAL;
    }
    
    // Default: adjustment lines (most line items are adjustments)
    return ColumnType.ADJUSTMENT;
  }
  
  /**
   * Calculate totals for TOTAL-type lines using formula: total = accumulated + adjustments
   * Also handles carryforward of accumulated balance between sections
   */
  private calculateTotalLines(lines: StatementLine[]): void {
    let accumulatedSum = 0;
    let adjustmentSum = 0;
    
    for (const line of lines) {
      const columnType = line.metadata.columnType;
      
      // Accumulate values from ACCUMULATED column
      if (columnType === ColumnType.ACCUMULATED && line.accumulatedSurplus !== null && line.accumulatedSurplus !== undefined) {
        accumulatedSum += line.accumulatedSurplus;
      }
      
      // Accumulate values from ADJUSTMENT column
      if (columnType === ColumnType.ADJUSTMENT && line.adjustments !== null && line.adjustments !== undefined) {
        adjustmentSum += line.adjustments;
      }
      
      // When we hit a TOTAL line, calculate the sum
      if (columnType === ColumnType.TOTAL) {
        line.accumulatedSurplus = accumulatedSum;
        line.adjustments = adjustmentSum;
        line.total = accumulatedSum + adjustmentSum;
        
        // Check if this is a closing balance line that should carry forward
        const lineCode = line.metadata.lineCode.toUpperCase();
        if (lineCode.includes('BALANCE') && lineCode.includes('JUNE') && lineCode.includes('CURRENT')) {
          // This is the closing balance - carry it forward to next section
          accumulatedSum = line.total ?? 0;
          adjustmentSum = 0;
        } else {
          // Reset for next section
          accumulatedSum = 0;
          adjustmentSum = 0;
        }
      }
    }
  }
  
  /**
   * Categorize line value into beginning balances, changes, or ending balances
   */
  private categorizeLineValue(
    templateLine: any, 
    value: number, 
    categories: NetAssetsCategories
  ): void {
    const lineCode = templateLine.lineCode.toUpperCase();
    const description = templateLine.description.toLowerCase();
    
    // Beginning net assets categorization
    if (this.isBeginningBalance(lineCode, description)) {
      if (this.isUnrestrictedAsset(lineCode, description)) {
        categories.beginningNetAssets.unrestricted += value;
      } else if (this.isTemporarilyRestricted(lineCode, description)) {
        categories.beginningNetAssets.temporarilyRestricted += value;
      } else if (this.isPermanentlyRestricted(lineCode, description)) {
        categories.beginningNetAssets.permanentlyRestricted += value;
      }
    }
    
    // Changes categorization
    if (this.isChangeItem(lineCode, description)) {
      if (this.isRevenue(lineCode, description)) {
        categories.changes.revenues += value;
      } else if (this.isExpense(lineCode, description)) {
        categories.changes.expenses += Math.abs(value); // Ensure positive for expenses
      } else if (this.isRestrictionRelease(lineCode, description)) {
        categories.changes.restrictionReleases += value;
      } else if (this.isOtherChange(lineCode, description)) {
        categories.changes.otherChanges += value;
      }
    }
    
    // Ending net assets categorization
    if (this.isEndingBalance(lineCode, description)) {
      if (this.isUnrestrictedAsset(lineCode, description)) {
        categories.endingNetAssets.unrestricted += value;
      } else if (this.isTemporarilyRestricted(lineCode, description)) {
        categories.endingNetAssets.temporarilyRestricted += value;
      } else if (this.isPermanentlyRestricted(lineCode, description)) {
        categories.endingNetAssets.permanentlyRestricted += value;
      }
    }
  }
  
  /**
   * Calculate variance between current and previous period with trend analysis
   */
  private calculateVariance(current: number, previous: number) {
    if (previous === 0 && current === 0) return undefined;
    
    const absolute = current - previous;
    const percentage = previous !== 0 ? (absolute / Math.abs(previous)) * 100 : 0;
    
    return {
      absolute: Math.round(absolute * 100) / 100,
      percentage: Math.round(percentage * 100) / 100
    };
  }
  
  /**
   * Calculate computed totals and net asset changes
   */
  private calculateComputedTotals(categories: NetAssetsCategories): void {
    // Calculate beginning total net assets
    categories.beginningNetAssets.total = 
      categories.beginningNetAssets.unrestricted + 
      categories.beginningNetAssets.temporarilyRestricted + 
      categories.beginningNetAssets.permanentlyRestricted;
    
    // Calculate net revenues (revenues - expenses)
    categories.changes.netRevenues = categories.changes.revenues - categories.changes.expenses;
    
    // Calculate total changes
    categories.changes.totalChanges = 
      categories.changes.netRevenues + 
      categories.changes.restrictionReleases + 
      categories.changes.otherChanges;
    
    // Calculate ending total net assets
    categories.endingNetAssets.total = 
      categories.endingNetAssets.unrestricted + 
      categories.endingNetAssets.temporarilyRestricted + 
      categories.endingNetAssets.permanentlyRestricted;
    
    // If ending balances are not provided, calculate them
    if (categories.endingNetAssets.total === 0 && categories.beginningNetAssets.total !== 0) {
      categories.endingNetAssets.total = categories.beginningNetAssets.total + categories.changes.totalChanges;
      
      // Distribute the change proportionally if individual ending balances are not provided
      if (categories.endingNetAssets.unrestricted === 0 && 
          categories.endingNetAssets.temporarilyRestricted === 0 && 
          categories.endingNetAssets.permanentlyRestricted === 0) {
        
        const totalBeginning = categories.beginningNetAssets.total;
        if (totalBeginning !== 0) {
          const changeRatio = categories.changes.totalChanges / totalBeginning;
          categories.endingNetAssets.unrestricted = 
            categories.beginningNetAssets.unrestricted * (1 + changeRatio);
          categories.endingNetAssets.temporarilyRestricted = 
            categories.beginningNetAssets.temporarilyRestricted * (1 + changeRatio);
          categories.endingNetAssets.permanentlyRestricted = 
            categories.beginningNetAssets.permanentlyRestricted * (1 + changeRatio);
        }
      }
    }
  }
  
  /**
   * Add computed lines for totals and changes
   */
  private addComputedLines(lines: StatementLine[], categories: NetAssetsCategories): void {
    const computedLines: StatementLine[] = [
      // Beginning net assets section
      {
        id: 'NET_ASSETS_BEGINNING_TOTAL',
        description: 'Total Beginning Net Assets',
        currentPeriodValue: categories.beginningNetAssets.total,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'BEGINNING_NET_ASSETS_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1000
        }
      },
      
      // Changes section
      {
        id: 'NET_ASSETS_NET_REVENUES',
        description: 'Net Revenues (Revenues less Expenses)',
        currentPeriodValue: categories.changes.netRevenues,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.changes.netRevenues < 0,
          indentLevel: 1,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'NET_REVENUES',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2000
        }
      },
      
      {
        id: 'NET_ASSETS_TOTAL_CHANGES',
        description: 'Total Changes in Net Assets',
        currentPeriodValue: categories.changes.totalChanges,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.changes.totalChanges < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'TOTAL_CHANGES_NET_ASSETS',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2100
        }
      },
      
      // Ending net assets section
      {
        id: 'NET_ASSETS_ENDING_UNRESTRICTED',
        description: 'Unrestricted Net Assets, End of Period',
        currentPeriodValue: categories.endingNetAssets.unrestricted,
        previousPeriodValue: 0,
        formatting: {
          bold: false,
          italic: categories.endingNetAssets.unrestricted < 0,
          indentLevel: 1,
          isSection: false,
          isSubtotal: false,
          isTotal: false
        },
        metadata: {
          lineCode: 'ENDING_UNRESTRICTED',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3000
        }
      },
      
      {
        id: 'NET_ASSETS_ENDING_TEMP_RESTRICTED',
        description: 'Temporarily Restricted Net Assets, End of Period',
        currentPeriodValue: categories.endingNetAssets.temporarilyRestricted,
        previousPeriodValue: 0,
        formatting: {
          bold: false,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: false,
          isTotal: false
        },
        metadata: {
          lineCode: 'ENDING_TEMP_RESTRICTED',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3100
        }
      },
      
      {
        id: 'NET_ASSETS_ENDING_PERM_RESTRICTED',
        description: 'Permanently Restricted Net Assets, End of Period',
        currentPeriodValue: categories.endingNetAssets.permanentlyRestricted,
        previousPeriodValue: 0,
        formatting: {
          bold: false,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: false,
          isTotal: false
        },
        metadata: {
          lineCode: 'ENDING_PERM_RESTRICTED',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3200
        }
      },
      
      {
        id: 'NET_ASSETS_ENDING_TOTAL',
        description: 'Total Ending Net Assets',
        currentPeriodValue: categories.endingNetAssets.total,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.endingNetAssets.total < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'ENDING_NET_ASSETS_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3300
        }
      }
    ];
    
    lines.push(...computedLines);
  }
  
  /**
   * Validate net asset changes and business rules
   */
  private validateNetAssets(
    categories: NetAssetsCategories,
    _lines: StatementLine[]
  ): ValidationResults {
    const businessRules: BusinessRuleValidation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Calculate net asset change validation
    const expectedEndingTotal = categories.beginningNetAssets.total + categories.changes.totalChanges;
    const netAssetChangeDifference = categories.endingNetAssets.total - expectedEndingTotal;
    const tolerance = 0.01; // Allow for rounding differences
    
    const netAssetChangeValid = Math.abs(netAssetChangeDifference) <= tolerance;
    
    const netAssetBalance: BalanceValidation = {
      isValid: netAssetChangeValid,
      leftSide: categories.beginningNetAssets.total + categories.changes.totalChanges,
      rightSide: categories.endingNetAssets.total,
      difference: Math.round(netAssetChangeDifference * 100) / 100,
      equation: 'Beginning Net Assets + Changes = Ending Net Assets'
    };
    
    // Rule 1: Net asset change balance validation
    businessRules.push({
      ruleId: 'NET_ASSETS_CHANGE_BALANCE',
      ruleName: 'Net Asset Change Balance',
      isValid: netAssetChangeValid,
      message: netAssetChangeValid 
        ? 'Net asset changes balance correctly'
        : `Net asset changes do not balance (difference: ${netAssetChangeDifference.toFixed(2)})`,
      affectedFields: ['BEGINNING_NET_ASSETS_TOTAL', 'TOTAL_CHANGES_NET_ASSETS', 'ENDING_NET_ASSETS_TOTAL']
    });
    
    // Rule 2: Net revenues calculation validation
    const expectedNetRevenues = categories.changes.revenues - categories.changes.expenses;
    const netRevenuesValid = Math.abs(categories.changes.netRevenues - expectedNetRevenues) <= tolerance;
    
    businessRules.push({
      ruleId: 'NET_ASSETS_NET_REVENUES_CALC',
      ruleName: 'Net Revenues Calculation',
      isValid: netRevenuesValid,
      message: netRevenuesValid
        ? 'Net revenues calculation is correct'
        : 'Net revenues calculation does not match revenues minus expenses',
      affectedFields: ['NET_REVENUES']
    });
    
    // Rule 3: Total changes calculation validation
    const expectedTotalChanges = 
      categories.changes.netRevenues + 
      categories.changes.restrictionReleases + 
      categories.changes.otherChanges;
    const totalChangesValid = Math.abs(categories.changes.totalChanges - expectedTotalChanges) <= tolerance;
    
    businessRules.push({
      ruleId: 'NET_ASSETS_TOTAL_CHANGES_CALC',
      ruleName: 'Total Changes Calculation',
      isValid: totalChangesValid,
      message: totalChangesValid
        ? 'Total changes calculation is correct'
        : 'Total changes calculation does not match sum of individual changes',
      affectedFields: ['TOTAL_CHANGES_NET_ASSETS']
    });
    
    // Rule 4: Restriction releases should not exceed temporarily restricted assets
    if (categories.beginningNetAssets.temporarilyRestricted > 0 && categories.changes.restrictionReleases > 0) {
      const restrictionReleaseValid = categories.changes.restrictionReleases <= categories.beginningNetAssets.temporarilyRestricted;
      
      businessRules.push({
        ruleId: 'NET_ASSETS_RESTRICTION_RELEASE_LIMIT',
        ruleName: 'Restriction Release Limit Check',
        isValid: restrictionReleaseValid,
        message: restrictionReleaseValid
          ? 'Restriction releases are within available temporarily restricted assets'
          : 'Restriction releases exceed available temporarily restricted assets',
        affectedFields: ['RESTRICTION_RELEASES', 'BEGINNING_TEMP_RESTRICTED']
      });
    }
    
    // Rule 5: Ending net assets components should sum to total
    const endingComponentsSum = 
      categories.endingNetAssets.unrestricted + 
      categories.endingNetAssets.temporarilyRestricted + 
      categories.endingNetAssets.permanentlyRestricted;
    const endingComponentsValid = Math.abs(categories.endingNetAssets.total - endingComponentsSum) <= tolerance;
    
    businessRules.push({
      ruleId: 'NET_ASSETS_ENDING_COMPONENTS_SUM',
      ruleName: 'Ending Net Assets Components Sum',
      isValid: endingComponentsValid,
      message: endingComponentsValid
        ? 'Ending net assets components sum correctly'
        : 'Ending net assets components do not sum to total',
      affectedFields: ['ENDING_UNRESTRICTED', 'ENDING_TEMP_RESTRICTED', 'ENDING_PERM_RESTRICTED', 'ENDING_NET_ASSETS_TOTAL']
    });
    
    // Rule 6: Three-column format validation - totals equal accumulated + adjustments
    const totalLinesValid: boolean[] = [];
    const invalidTotalLines: string[] = [];
    
    for (const line of _lines) {
      if (line.metadata.columnType === ColumnType.TOTAL && line.total !== null && line.total !== undefined) {
        const accumulated = line.accumulatedSurplus ?? 0;
        const adjustments = line.adjustments ?? 0;
        const expectedTotal = accumulated + adjustments;
        const isValid = Math.abs(line.total - expectedTotal) <= tolerance;
        
        totalLinesValid.push(isValid);
        
        if (!isValid) {
          invalidTotalLines.push(line.metadata.lineCode);
        }
      }
    }
    
    const allTotalsValid = totalLinesValid.length === 0 || totalLinesValid.every(v => v);
    
    businessRules.push({
      ruleId: 'NET_ASSETS_THREE_COLUMN_TOTALS',
      ruleName: 'Three-Column Total Calculation',
      isValid: allTotalsValid,
      message: allTotalsValid
        ? 'All total lines correctly calculate accumulated + adjustments'
        : `Total calculation mismatch in lines: ${invalidTotalLines.join(', ')}`,
      affectedFields: invalidTotalLines
    });
    
    // Rule 7: Three-column balance validation
    // Verify that the sum of all accumulated and adjustment columns equals the final total
    let totalAccumulated = 0;
    let totalAdjustments = 0;
    let finalTotal = 0;
    
    for (const line of _lines) {
      if (line.metadata.columnType === ColumnType.ACCUMULATED && line.accumulatedSurplus !== null && line.accumulatedSurplus !== undefined) {
        totalAccumulated += line.accumulatedSurplus;
      }
      if (line.metadata.columnType === ColumnType.ADJUSTMENT && line.adjustments !== null && line.adjustments !== undefined) {
        totalAdjustments += line.adjustments;
      }
      // Get the last TOTAL line as the final total
      if (line.metadata.columnType === ColumnType.TOTAL && line.total !== null && line.total !== undefined) {
        finalTotal = line.total;
      }
    }
    
    const threeColumnBalanceValid = finalTotal === 0 || Math.abs(finalTotal - (totalAccumulated + totalAdjustments)) <= tolerance;
    
    businessRules.push({
      ruleId: 'NET_ASSETS_THREE_COLUMN_BALANCE',
      ruleName: 'Three-Column Balance Validation',
      isValid: threeColumnBalanceValid,
      message: threeColumnBalanceValid
        ? 'Three-column format balances correctly'
        : 'Three-column format does not balance',
      affectedFields: ['ACCUMULATED_SURPLUS', 'ADJUSTMENTS', 'TOTAL']
    });
    
    // Warnings
    if (categories.changes.totalChanges < 0) {
      warnings.push('Negative change in net assets indicates organizational challenges');
    }
    
    if (categories.endingNetAssets.total < 0) {
      warnings.push('Negative ending net assets indicates accumulated deficits');
    }
    
    if (categories.changes.revenues === 0) {
      warnings.push('No revenues recorded for this period');
    }
    
    if (categories.changes.expenses === 0) {
      warnings.push('No expenses recorded for this period');
    }
    
    if (categories.beginningNetAssets.total === 0) {
      warnings.push('No beginning net assets - this may be the first reporting period');
    }
    
    // Calculate growth rate if beginning balance exists
    if (categories.beginningNetAssets.total > 0) {
      const growthRate = (categories.changes.totalChanges / categories.beginningNetAssets.total) * 100;
      if (Math.abs(growthRate) > 50) {
        warnings.push(`Large change in net assets: ${growthRate.toFixed(1)}% growth rate`);
      }
    }
    
    // Errors
    if (Math.abs(netAssetChangeDifference) > 100) {
      errors.push(`Significant net asset change imbalance: ${netAssetChangeDifference.toFixed(2)}`);
    }
    
    const isValid = businessRules.every(rule => rule.isValid) && errors.length === 0;
    
    return {
      isValid,
      accountingEquation: netAssetBalance,
      businessRules,
      warnings,
      errors
    };
  }
  
  /**
   * Helper methods for categorization
   */
  private isBeginningBalance(lineCode: string, description: string): boolean {
    const beginningKeywords = ['beginning', 'start', 'opening', 'initial'];
    return beginningKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isEndingBalance(lineCode: string, description: string): boolean {
    const endingKeywords = ['ending', 'end', 'closing', 'final'];
    return endingKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isChangeItem(lineCode: string, description?: string): boolean {
    const changeKeywords = ['change', 'revenue', 'expense', 'release', 'gain', 'loss'];
    return changeKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || 
      (description && description.includes(keyword))
    ) && !this.isBeginningBalance(lineCode, description || '') && !this.isEndingBalance(lineCode, description || '');
  }
  
  private isUnrestrictedAsset(lineCode: string, description: string): boolean {
    const unrestrictedKeywords = ['unrestricted', 'general', 'operating'];
    return unrestrictedKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isTemporarilyRestricted(lineCode: string, description: string): boolean {
    const tempRestrictedKeywords = ['temporarily', 'temp', 'restricted', 'purpose'];
    return tempRestrictedKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    ) && !this.isPermanentlyRestricted(lineCode, description);
  }
  
  private isPermanentlyRestricted(lineCode: string, description: string): boolean {
    const permRestrictedKeywords = ['permanently', 'perm', 'endowment', 'permanent'];
    return permRestrictedKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isRevenue(lineCode: string, description: string): boolean {
    const revenueKeywords = ['revenue', 'income', 'grant', 'donation', 'contribution'];
    return revenueKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isExpense(lineCode: string, description: string): boolean {
    const expenseKeywords = ['expense', 'cost', 'expenditure'];
    return expenseKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isRestrictionRelease(lineCode: string, description: string): boolean {
    const releaseKeywords = ['release', 'satisfaction', 'restriction'];
    return releaseKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isOtherChange(lineCode: string, description: string): boolean {
    const otherKeywords = ['other', 'miscellaneous', 'adjustment', 'transfer'];
    return otherKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || description.includes(keyword)
    );
  }
  
  private isTotalLine(lineCode: string): boolean {
    const totalKeywords = ['TOTAL', 'SUM', 'NET'];
    return totalKeywords.some(keyword => lineCode.toUpperCase().includes(keyword));
  }
  
  private sortLinesByDisplayOrder(lines: StatementLine[]): StatementLine[] {
    return lines.sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);
  }
  
  private initializeCategories(): NetAssetsCategories {
    return {
      beginningNetAssets: {
        unrestricted: 0,
        temporarilyRestricted: 0,
        permanentlyRestricted: 0,
        total: 0
      },
      changes: {
        revenues: 0,
        expenses: 0,
        netRevenues: 0,
        restrictionReleases: 0,
        otherChanges: 0,
        totalChanges: 0
      },
      endingNetAssets: {
        unrestricted: 0,
        temporarilyRestricted: 0,
        permanentlyRestricted: 0,
        total: 0
      }
    };
  }
}