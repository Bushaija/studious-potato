/**
 * Revenue & Expenditure Statement Processor
 * Handles REV_EXP statement-specific logic including revenue/expense categorization
 * and surplus/deficit calculations
 */

import { 
  StatementTemplate, 
  StatementLine, 
  ValidationResults,
  BusinessRuleValidation
} from "../types/core.types";
import { EventAggregation } from "../types/engine.types";

export interface RevenueExpenditureCategories {
  revenue: {
    operatingRevenue: number;
    nonOperatingRevenue: number;
    totalRevenue: number;
  };
  expenditure: {
    operatingExpenses: number;
    nonOperatingExpenses: number;
    totalExpenditure: number;
  };
  surplus: {
    operatingSurplus: number;
    netSurplus: number;
  };
}

export class RevenueExpenditureProcessor {
  
  /**
   * Process REV_EXP statement with revenue/expense categorization
   */
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation
  ): {
    lines: StatementLine[];
    categories: RevenueExpenditureCategories;
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
        id: `REV_EXP_${templateLine.lineCode}`,
        description: templateLine.description,
        currentPeriodValue: currentValue,
        previousPeriodValue: previousValue,
        variance: this.calculateVariance(currentValue, previousValue),
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting for revenue/expense display
          bold: templateLine.formatting.bold || this.isTotalLine(templateLine.lineCode),
          italic: templateLine.formatting.italic || (currentValue < 0 && !this.isTotalLine(templateLine.lineCode))
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
    
    // Calculate computed totals and surplus/deficit
    this.calculateComputedTotals(categories);
    
    // Add computed lines for totals and surplus/deficit
    this.addComputedLines(lines, categories);
    
    // Validate revenue and expenditure rules
    const validation = this.validateRevenueExpenditure(categories, lines);
    
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
   * Categorize line value into revenue or expenditure categories
   */
  private categorizeLineValue(
    templateLine: any, 
    value: number, 
    categories: RevenueExpenditureCategories
  ): void {
    const lineCode = templateLine.lineCode.toUpperCase();
    const description = templateLine.description.toLowerCase();
    
    // Revenue categorization
    if (this.isRevenueItem(lineCode, description)) {
      if (this.isOperatingRevenue(lineCode, description)) {
        categories.revenue.operatingRevenue += value;
      } else {
        categories.revenue.nonOperatingRevenue += value;
      }
    }
    
    // Expenditure categorization
    if (this.isExpenditureItem(lineCode, description)) {
      if (this.isOperatingExpense(lineCode, description)) {
        categories.expenditure.operatingExpenses += Math.abs(value); // Ensure positive for expenses
      } else {
        categories.expenditure.nonOperatingExpenses += Math.abs(value);
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
   * Calculate computed totals and surplus/deficit
   */
  private calculateComputedTotals(categories: RevenueExpenditureCategories): void {
    // Calculate total revenue
    categories.revenue.totalRevenue = 
      categories.revenue.operatingRevenue + categories.revenue.nonOperatingRevenue;
    
    // Calculate total expenditure
    categories.expenditure.totalExpenditure = 
      categories.expenditure.operatingExpenses + categories.expenditure.nonOperatingExpenses;
    
    // Calculate operating surplus (operating revenue - operating expenses)
    categories.surplus.operatingSurplus = 
      categories.revenue.operatingRevenue - categories.expenditure.operatingExpenses;
    
    // Calculate net surplus (total revenue - total expenditure)
    categories.surplus.netSurplus = 
      categories.revenue.totalRevenue - categories.expenditure.totalExpenditure;
  }
  
  /**
   * Add computed lines for totals and surplus/deficit
   */
  private addComputedLines(lines: StatementLine[], categories: RevenueExpenditureCategories): void {
    const computedLines: StatementLine[] = [
      {
        id: 'REV_EXP_TOTAL_REVENUE',
        description: 'Total Revenue',
        currentPeriodValue: categories.revenue.totalRevenue,
        previousPeriodValue: 0, // Will be calculated if previous period data available
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 0,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'TOTAL_REVENUE',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1000
        }
      },
      {
        id: 'REV_EXP_TOTAL_EXPENDITURE',
        description: 'Total Expenditure',
        currentPeriodValue: categories.expenditure.totalExpenditure,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 0,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'TOTAL_EXPENDITURE',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2000
        }
      },
      {
        id: 'REV_EXP_NET_SURPLUS',
        description: categories.surplus.netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit',
        currentPeriodValue: categories.surplus.netSurplus,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.surplus.netSurplus < 0,
          indentLevel: 0,
          isSection: false,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_SURPLUS',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3000
        }
      }
    ];
    
    lines.push(...computedLines);
  }
  
  /**
   * Validate revenue and expenditure business rules
   */
  private validateRevenueExpenditure(
    categories: RevenueExpenditureCategories,
    _lines: StatementLine[]
  ): ValidationResults {
    const businessRules: BusinessRuleValidation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Rule 1: Total revenue should be positive or zero
    businessRules.push({
      ruleId: 'REV_EXP_REVENUE_NON_NEGATIVE',
      ruleName: 'Revenue Non-Negative Check',
      isValid: categories.revenue.totalRevenue >= 0,
      message: categories.revenue.totalRevenue >= 0 
        ? 'Total revenue is non-negative'
        : 'Total revenue is negative - this may indicate data entry errors',
      affectedFields: ['TOTAL_REVENUE']
    });
    
    // Rule 2: Total expenditure should be positive or zero
    businessRules.push({
      ruleId: 'REV_EXP_EXPENDITURE_NON_NEGATIVE',
      ruleName: 'Expenditure Non-Negative Check',
      isValid: categories.expenditure.totalExpenditure >= 0,
      message: categories.expenditure.totalExpenditure >= 0
        ? 'Total expenditure is non-negative'
        : 'Total expenditure is negative - this may indicate data entry errors',
      affectedFields: ['TOTAL_EXPENDITURE']
    });
    
    // Rule 3: Operating surplus calculation validation
    const expectedOperatingSurplus = categories.revenue.operatingRevenue - categories.expenditure.operatingExpenses;
    businessRules.push({
      ruleId: 'REV_EXP_OPERATING_SURPLUS_CALC',
      ruleName: 'Operating Surplus Calculation',
      isValid: Math.abs(categories.surplus.operatingSurplus - expectedOperatingSurplus) < 0.01,
      message: 'Operating surplus calculation is correct',
      affectedFields: ['OPERATING_SURPLUS']
    });
    
    // Rule 4: Net surplus calculation validation
    const expectedNetSurplus = categories.revenue.totalRevenue - categories.expenditure.totalExpenditure;
    businessRules.push({
      ruleId: 'REV_EXP_NET_SURPLUS_CALC',
      ruleName: 'Net Surplus Calculation',
      isValid: Math.abs(categories.surplus.netSurplus - expectedNetSurplus) < 0.01,
      message: 'Net surplus calculation is correct',
      affectedFields: ['NET_SURPLUS']
    });
    
    // Warning: Large deficit
    if (categories.surplus.netSurplus < -10000) {
      warnings.push(`Large deficit detected: ${Math.abs(categories.surplus.netSurplus).toLocaleString()}`);
    }
    
    // Warning: No revenue
    if (categories.revenue.totalRevenue === 0) {
      warnings.push('No revenue recorded for this period');
    }
    
    // Warning: No expenditure
    if (categories.expenditure.totalExpenditure === 0) {
      warnings.push('No expenditure recorded for this period');
    }
    
    const isValid = businessRules.every(rule => rule.isValid) && errors.length === 0;
    
    return {
      isValid,
      accountingEquation: {
        isValid: true,
        leftSide: categories.revenue.totalRevenue,
        rightSide: categories.expenditure.totalExpenditure,
        difference: categories.surplus.netSurplus,
        equation: 'Revenue - Expenditure = Surplus/Deficit'
      },
      businessRules,
      warnings,
      errors
    };
  }
  
  /**
   * Helper methods for categorization
   */
  private isRevenueItem(lineCode: string, description: string): boolean {
    const revenueKeywords = ['revenue', 'income', 'grant', 'donation', 'fee', 'service', 'interest'];
    const revenueLineCodes = ['REV', 'INC', 'GRANT', 'DONATION', 'FEE'];
    
    return revenueLineCodes.some(code => lineCode.includes(code)) ||
           revenueKeywords.some(keyword => description.includes(keyword));
  }
  
  private isExpenditureItem(lineCode: string, description: string): boolean {
    const expenditureKeywords = ['expense', 'expenditure', 'cost', 'salary', 'wage', 'supply', 'equipment'];
    const expenditureLineCodes = ['EXP', 'COST', 'SAL', 'WAGE', 'SUPPLY', 'EQUIP'];
    
    return expenditureLineCodes.some(code => lineCode.includes(code)) ||
           expenditureKeywords.some(keyword => description.includes(keyword));
  }
  
  private isOperatingRevenue(_lineCode: string, description: string): boolean {
    const operatingKeywords = ['service', 'program', 'core', 'primary', 'main'];
    const nonOperatingKeywords = ['interest', 'investment', 'donation', 'grant', 'other'];
    
    // If it contains non-operating keywords, it's non-operating
    if (nonOperatingKeywords.some(keyword => description.includes(keyword))) {
      return false;
    }
    
    // If it contains operating keywords or no specific indicators, assume operating
    return operatingKeywords.some(keyword => description.includes(keyword)) || 
           !nonOperatingKeywords.some(keyword => description.includes(keyword));
  }
  
  private isOperatingExpense(_lineCode: string, description: string): boolean {
    const operatingKeywords = ['salary', 'wage', 'supply', 'program', 'service', 'maintenance'];
    const nonOperatingKeywords = ['interest', 'depreciation', 'amortization', 'other'];
    
    // If it contains non-operating keywords, it's non-operating
    if (nonOperatingKeywords.some(keyword => description.includes(keyword))) {
      return false;
    }
    
    // If it contains operating keywords or no specific indicators, assume operating
    return operatingKeywords.some(keyword => description.includes(keyword)) || 
           !nonOperatingKeywords.some(keyword => description.includes(keyword));
  }
  
  private isTotalLine(lineCode: string): boolean {
    const totalKeywords = ['TOTAL', 'SUM', 'SURPLUS', 'DEFICIT'];
    return totalKeywords.some(keyword => lineCode.toUpperCase().includes(keyword));
  }
  
  private sortLinesByDisplayOrder(lines: StatementLine[]): StatementLine[] {
    return lines.sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);
  }
  
  private initializeCategories(): RevenueExpenditureCategories {
    return {
      revenue: {
        operatingRevenue: 0,
        nonOperatingRevenue: 0,
        totalRevenue: 0
      },
      expenditure: {
        operatingExpenses: 0,
        nonOperatingExpenses: 0,
        totalExpenditure: 0
      },
      surplus: {
        operatingSurplus: 0,
        netSurplus: 0
      }
    };
  }
}