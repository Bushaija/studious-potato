/**
 * Balance Sheet Statement Processor
 * Handles BAL_SHEET statement-specific logic including asset/liability/equity sections
 * and accounting equation validation (Assets = Liabilities + Equity)
 */

import { 
  StatementTemplate, 
  StatementLine, 
  ValidationResults,
  BusinessRuleValidation,
  BalanceValidation
} from "../types/core.types";
import { EventAggregation } from "../types/engine.types";

export interface BalanceSheetCategories {
  assets: {
    currentAssets: number;
    nonCurrentAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: number;
    nonCurrentLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    currentPeriodSurplus: number;
    totalEquity: number;
  };
}

export class BalanceSheetProcessor {
  
  /**
   * Process BAL_SHEET statement with asset/liability/equity categorization
   */
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation
  ): {
    lines: StatementLine[];
    categories: BalanceSheetCategories;
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
      
      // Create statement line
      const statementLine: StatementLine = {
        id: `BAL_SHEET_${templateLine.lineCode}`,
        description: templateLine.description,
        currentPeriodValue: currentValue,
        previousPeriodValue: previousValue,
        variance: this.calculateVariance(currentValue, previousValue),
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting for balance sheet display
          bold: templateLine.formatting.bold || this.isTotalLine(templateLine.lineCode),
          italic: templateLine.formatting.italic || (currentValue < 0 && this.isAssetLine(templateLine.lineCode))
        },
        metadata: {
          lineCode: templateLine.lineCode,
          eventCodes: templateLine.eventMappings || [],
          formula: templateLine.calculationFormula,
          isComputed: !!templateLine.calculationFormula,
          displayOrder: templateLine.displayOrder
        }
      };
      
      lines.push(statementLine);
    }
    
    // Calculate computed totals
    this.calculateComputedTotals(categories);
    
    // Add computed lines for totals and sections
    this.addComputedLines(lines, categories);
    
    // Validate accounting equation and balance sheet rules
    const validation = this.validateBalanceSheet(categories, lines);
    
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
   * Categorize line value into asset, liability, or equity categories
   */
  private categorizeLineValue(
    templateLine: any, 
    value: number, 
    categories: BalanceSheetCategories
  ): void {
    const lineCode = templateLine.lineCode.toUpperCase();
    const description = templateLine.description.toLowerCase();
    
    // Asset categorization
    if (this.isAssetLine(lineCode, description)) {
      if (this.isCurrentAsset(lineCode, description)) {
        categories.assets.currentAssets += value;
      } else {
        categories.assets.nonCurrentAssets += value;
      }
    }
    
    // Liability categorization
    if (this.isLiabilityLine(lineCode, description)) {
      if (this.isCurrentLiability(lineCode, description)) {
        categories.liabilities.currentLiabilities += Math.abs(value); // Ensure positive for liabilities
      } else {
        categories.liabilities.nonCurrentLiabilities += Math.abs(value);
      }
    }
    
    // Equity categorization
    if (this.isEquityLine(lineCode, description)) {
      if (this.isRetainedEarnings(lineCode, description)) {
        categories.equity.retainedEarnings += value;
      } else if (this.isCurrentPeriodSurplus(lineCode, description)) {
        categories.equity.currentPeriodSurplus += value;
      }
    }
  }
  
  /**
   * Calculate variance between current and previous period
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
   * Calculate computed totals for each section
   */
  private calculateComputedTotals(categories: BalanceSheetCategories): void {
    // Calculate total assets
    categories.assets.totalAssets = 
      categories.assets.currentAssets + categories.assets.nonCurrentAssets;
    
    // Calculate total liabilities
    categories.liabilities.totalLiabilities = 
      categories.liabilities.currentLiabilities + categories.liabilities.nonCurrentLiabilities;
    
    // Calculate total equity
    categories.equity.totalEquity = 
      categories.equity.retainedEarnings + categories.equity.currentPeriodSurplus;
  }
  
  /**
   * Add computed lines for totals and sections
   */
  private addComputedLines(lines: StatementLine[], categories: BalanceSheetCategories): void {
    const computedLines: StatementLine[] = [
      // Assets section
      {
        id: 'BAL_SHEET_CURRENT_ASSETS_TOTAL',
        description: 'Total Current Assets',
        currentPeriodValue: categories.assets.currentAssets,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'CURRENT_ASSETS_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1000
        }
      },
      {
        id: 'BAL_SHEET_NON_CURRENT_ASSETS_TOTAL',
        description: 'Total Non-Current Assets',
        currentPeriodValue: categories.assets.nonCurrentAssets,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'NON_CURRENT_ASSETS_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1100
        }
      },
      {
        id: 'BAL_SHEET_TOTAL_ASSETS',
        description: 'TOTAL ASSETS',
        currentPeriodValue: categories.assets.totalAssets,
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
          lineCode: 'TOTAL_ASSETS',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1200
        }
      },
      
      // Liabilities section
      {
        id: 'BAL_SHEET_CURRENT_LIABILITIES_TOTAL',
        description: 'Total Current Liabilities',
        currentPeriodValue: categories.liabilities.currentLiabilities,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'CURRENT_LIABILITIES_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2000
        }
      },
      {
        id: 'BAL_SHEET_NON_CURRENT_LIABILITIES_TOTAL',
        description: 'Total Non-Current Liabilities',
        currentPeriodValue: categories.liabilities.nonCurrentLiabilities,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 1,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'NON_CURRENT_LIABILITIES_TOTAL',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2100
        }
      },
      {
        id: 'BAL_SHEET_TOTAL_LIABILITIES',
        description: 'TOTAL LIABILITIES',
        currentPeriodValue: categories.liabilities.totalLiabilities,
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
          lineCode: 'TOTAL_LIABILITIES',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2200
        }
      },
      
      // Equity section
      {
        id: 'BAL_SHEET_TOTAL_EQUITY',
        description: 'TOTAL EQUITY',
        currentPeriodValue: categories.equity.totalEquity,
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
          lineCode: 'TOTAL_EQUITY',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3000
        }
      },
      
      // Total liabilities and equity
      {
        id: 'BAL_SHEET_TOTAL_LIABILITIES_EQUITY',
        description: 'TOTAL LIABILITIES AND EQUITY',
        currentPeriodValue: categories.liabilities.totalLiabilities + categories.equity.totalEquity,
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
          lineCode: 'TOTAL_LIABILITIES_EQUITY',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3100
        }
      }
    ];
    
    lines.push(...computedLines);
  }
  
  /**
   * Validate accounting equation and balance sheet business rules
   */
  private validateBalanceSheet(
    categories: BalanceSheetCategories,
    _lines: StatementLine[]
  ): ValidationResults {
    const businessRules: BusinessRuleValidation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Calculate accounting equation components
    const totalAssets = categories.assets.totalAssets;
    const totalLiabilitiesAndEquity = categories.liabilities.totalLiabilities + categories.equity.totalEquity;
    const difference = totalAssets - totalLiabilitiesAndEquity;
    const tolerance = 0.01; // Allow for rounding differences
    
    // Primary accounting equation validation
    const accountingEquationValid = Math.abs(difference) <= tolerance;
    
    const accountingEquation: BalanceValidation = {
      isValid: accountingEquationValid,
      leftSide: totalAssets,
      rightSide: totalLiabilitiesAndEquity,
      difference: Math.round(difference * 100) / 100,
      equation: 'Assets = Liabilities + Equity'
    };
    
    // Rule 1: Accounting equation balance
    businessRules.push({
      ruleId: 'BAL_SHEET_ACCOUNTING_EQUATION',
      ruleName: 'Accounting Equation Balance',
      isValid: accountingEquationValid,
      message: accountingEquationValid 
        ? 'Assets equal Liabilities plus Equity'
        : `Assets do not equal Liabilities plus Equity (difference: ${difference.toFixed(2)})`,
      affectedFields: ['TOTAL_ASSETS', 'TOTAL_LIABILITIES', 'TOTAL_EQUITY']
    });
    
    // Rule 2: Assets should be positive or zero
    businessRules.push({
      ruleId: 'BAL_SHEET_ASSETS_NON_NEGATIVE',
      ruleName: 'Assets Non-Negative Check',
      isValid: totalAssets >= 0,
      message: totalAssets >= 0 
        ? 'Total assets are non-negative'
        : 'Total assets are negative - this indicates a data error',
      affectedFields: ['TOTAL_ASSETS']
    });
    
    // Rule 3: Current assets should be reasonable proportion of total assets
    const currentAssetRatio = totalAssets > 0 ? (categories.assets.currentAssets / totalAssets) : 0;
    const currentAssetRatioValid = currentAssetRatio >= 0 && currentAssetRatio <= 1;
    businessRules.push({
      ruleId: 'BAL_SHEET_CURRENT_ASSET_RATIO',
      ruleName: 'Current Asset Ratio Check',
      isValid: currentAssetRatioValid,
      message: currentAssetRatioValid
        ? `Current assets represent ${(currentAssetRatio * 100).toFixed(1)}% of total assets`
        : 'Current asset ratio is outside expected range',
      affectedFields: ['CURRENT_ASSETS_TOTAL', 'TOTAL_ASSETS']
    });
    
    // Rule 4: Current liabilities should be reasonable proportion of total liabilities
    const currentLiabilityRatio = categories.liabilities.totalLiabilities > 0 
      ? (categories.liabilities.currentLiabilities / categories.liabilities.totalLiabilities) : 0;
    const currentLiabilityRatioValid = currentLiabilityRatio >= 0 && currentLiabilityRatio <= 1;
    businessRules.push({
      ruleId: 'BAL_SHEET_CURRENT_LIABILITY_RATIO',
      ruleName: 'Current Liability Ratio Check',
      isValid: currentLiabilityRatioValid,
      message: currentLiabilityRatioValid
        ? `Current liabilities represent ${(currentLiabilityRatio * 100).toFixed(1)}% of total liabilities`
        : 'Current liability ratio is outside expected range',
      affectedFields: ['CURRENT_LIABILITIES_TOTAL', 'TOTAL_LIABILITIES']
    });
    
    // Rule 5: Equity should not be excessively negative
    const equityExcessivelyNegative = categories.equity.totalEquity < -Math.abs(totalAssets * 0.5);
    businessRules.push({
      ruleId: 'BAL_SHEET_EQUITY_REASONABLE',
      ruleName: 'Equity Reasonableness Check',
      isValid: !equityExcessivelyNegative,
      message: equityExcessivelyNegative
        ? 'Equity is excessively negative relative to assets'
        : 'Equity level appears reasonable',
      affectedFields: ['TOTAL_EQUITY']
    });
    
    // Warnings
    if (Math.abs(difference) > tolerance && Math.abs(difference) <= 100) {
      warnings.push(`Small accounting equation imbalance: ${difference.toFixed(2)} (may be due to rounding)`);
    }
    
    if (categories.assets.currentAssets === 0 && categories.assets.totalAssets > 0) {
      warnings.push('No current assets recorded - this may indicate incomplete data');
    }
    
    if (categories.liabilities.totalLiabilities === 0 && categories.equity.totalEquity > 0) {
      warnings.push('No liabilities recorded - unusual for most organizations');
    }
    
    if (categories.equity.totalEquity < 0) {
      warnings.push('Negative equity indicates accumulated losses exceed contributed capital');
    }
    
    // Errors
    if (Math.abs(difference) > 100) {
      errors.push(`Significant accounting equation imbalance: ${difference.toFixed(2)}`);
    }
    
    const isValid = businessRules.every(rule => rule.isValid) && errors.length === 0;
    
    return {
      isValid,
      accountingEquation,
      businessRules,
      warnings,
      errors
    };
  }
  
  /**
   * Helper methods for categorization
   */
  private isAssetLine(lineCode: string, description?: string): boolean {
    const assetKeywords = ['asset', 'cash', 'receivable', 'inventory', 'equipment', 'building', 'land'];
    const assetLineCodes = ['ASSET', 'CASH', 'RECV', 'INV', 'EQUIP', 'BLDG', 'LAND'];
    
    return assetLineCodes.some(code => lineCode.includes(code)) ||
           (description ? assetKeywords.some(keyword => description.includes(keyword)) : false);
  }
  
  private isLiabilityLine(lineCode: string, description?: string): boolean {
    const liabilityKeywords = ['liability', 'payable', 'loan', 'debt', 'accrued', 'deferred'];
    const liabilityLineCodes = ['LIAB', 'PAY', 'LOAN', 'DEBT', 'ACCR', 'DEF'];
    
    return liabilityLineCodes.some(code => lineCode.includes(code)) ||
           (description ? liabilityKeywords.some(keyword => description.includes(keyword)) : false);
  }
  
  private isEquityLine(lineCode: string, description?: string): boolean {
    const equityKeywords = ['equity', 'capital', 'retained', 'surplus', 'fund', 'reserve'];
    const equityLineCodes = ['EQUITY', 'CAP', 'RETAIN', 'SURP', 'FUND', 'RES'];
    
    return equityLineCodes.some(code => lineCode.includes(code)) ||
           (description ? equityKeywords.some(keyword => description.includes(keyword)) : false);
  }
  
  private isCurrentAsset(lineCode: string, description?: string): boolean {
    const currentKeywords = ['current', 'cash', 'receivable', 'inventory', 'prepaid'];
    const nonCurrentKeywords = ['fixed', 'property', 'equipment', 'building', 'land', 'long-term'];
    
    if (description && nonCurrentKeywords.some(keyword => description.includes(keyword))) {
      return false;
    }
    
    return currentKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || 
      (description && description.includes(keyword))
    );
  }
  
  private isCurrentLiability(lineCode: string, description?: string): boolean {
    const currentKeywords = ['current', 'payable', 'accrued', 'short-term'];
    const nonCurrentKeywords = ['long-term', 'mortgage', 'bond', 'deferred'];
    
    if (description && nonCurrentKeywords.some(keyword => description.includes(keyword))) {
      return false;
    }
    
    return currentKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || 
      (description && description.includes(keyword))
    );
  }
  
  private isRetainedEarnings(lineCode: string, description?: string): boolean {
    const retainedKeywords = ['retained', 'accumulated', 'reserve', 'fund'];
    
    return retainedKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || 
      (description && description.includes(keyword))
    );
  }
  
  private isCurrentPeriodSurplus(lineCode: string, description?: string): boolean {
    const surplusKeywords = ['surplus', 'deficit', 'current', 'period', 'year'];
    
    return surplusKeywords.some(keyword => 
      lineCode.includes(keyword.toUpperCase()) || 
      (description && description.includes(keyword))
    );
  }
  
  private isTotalLine(lineCode: string): boolean {
    const totalKeywords = ['TOTAL', 'SUM'];
    return totalKeywords.some(keyword => lineCode.toUpperCase().includes(keyword));
  }
  
  private sortLinesByDisplayOrder(lines: StatementLine[]): StatementLine[] {
    return lines.sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);
  }
  
  private initializeCategories(): BalanceSheetCategories {
    return {
      assets: {
        currentAssets: 0,
        nonCurrentAssets: 0,
        totalAssets: 0
      },
      liabilities: {
        currentLiabilities: 0,
        nonCurrentLiabilities: 0,
        totalLiabilities: 0
      },
      equity: {
        retainedEarnings: 0,
        currentPeriodSurplus: 0,
        totalEquity: 0
      }
    };
  }
}