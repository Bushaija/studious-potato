/**
 * Budget vs Actual Statement Processor
 * Handles BUDGET_VS_ACTUAL statement-specific logic using both planning and execution data
 * with variance calculation logic for budget vs actual analysis
 */

import { 
  StatementTemplate, 
  StatementLine, 
  ValidationResults,
  BusinessRuleValidation,
  BalanceValidation
} from "../types/core.types";
import { EventAggregation } from "../types/engine.types";

export interface BudgetVsActualCategories {
  budget: {
    revenues: number;
    expenses: number;
    netBudget: number;
  };
  actual: {
    revenues: number;
    expenses: number;
    netActual: number;
  };
  variances: {
    revenueVariance: {
      absolute: number;
      percentage: number;
      favorable: boolean;
    };
    expenseVariance: {
      absolute: number;
      percentage: number;
      favorable: boolean;
    };
    netVariance: {
      absolute: number;
      percentage: number;
      favorable: boolean;
    };
  };
}

export interface BudgetVsActualLine extends StatementLine {
  budgetValue: number;
  actualValue: number;
  varianceAmount: number;
  variancePercentage: number;
  isFavorable: boolean;
}

export class BudgetVsActualProcessor {
  
  /**
   * Process BUDGET_VS_ACTUAL statement with dual data source processing
   */
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation,
    planningData?: EventAggregation,
    executionData?: EventAggregation
  ): {
    lines: BudgetVsActualLine[];
    categories: BudgetVsActualCategories;
    validation: ValidationResults;
  } {
    const lines: BudgetVsActualLine[] = [];
    const categories = this.initializeCategories();
    
    // Use provided planning/execution data or extract from current period data
    const budgetData = planningData || this.extractPlanningData(currentPeriodData);
    const actualData = executionData || this.extractExecutionData(currentPeriodData);
    
    // Process each template line
    for (const templateLine of template.lines) {
      const budgetValue = this.calculateLineValue(templateLine, budgetData);
      const actualValue = this.calculateLineValue(templateLine, actualData);
      
      // Calculate previous period values if available
      const previousActualValue = previousPeriodData 
        ? this.calculateLineValue(templateLine, this.extractExecutionData(previousPeriodData))
        : 0;
      
      // Categorize the line values
      this.categorizeLineValue(templateLine, budgetValue, actualValue, categories);
      
      // Calculate variance
      const variance = this.calculateBudgetVariance(budgetValue, actualValue, templateLine);
      
      // Create budget vs actual statement line
      const statementLine: BudgetVsActualLine = {
        id: `BUDGET_VS_ACTUAL_${templateLine.lineCode}`,
        description: templateLine.description,
        currentPeriodValue: actualValue, // Current period shows actual
        previousPeriodValue: previousActualValue,
        budgetValue,
        actualValue,
        varianceAmount: variance.absolute,
        variancePercentage: variance.percentage,
        isFavorable: variance.favorable,
        variance: {
          absolute: variance.absolute,
          percentage: variance.percentage
        },
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting for budget vs actual display
          bold: templateLine.formatting.bold || this.isTotalLine(templateLine.lineCode),
          italic: templateLine.formatting.italic || (!variance.favorable && Math.abs(variance.percentage) > 10)
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
    
    // Calculate computed totals and variances
    this.calculateComputedTotals(categories);
    
    // Add computed lines for totals and variances
    this.addComputedLines(lines, categories);
    
    // Validate budget vs actual reconciliation and business rules
    const validation = this.validateBudgetVsActual(categories, lines);
    
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
   * Extract planning data from mixed aggregation
   */
  private extractPlanningData(aggregation: EventAggregation): EventAggregation {
    // In a real implementation, this would filter the aggregation by EventType.PLANNING
    // For now, return the full aggregation assuming it contains planning data
    return aggregation;
  }
  
  /**
   * Extract execution data from mixed aggregation
   */
  private extractExecutionData(aggregation: EventAggregation): EventAggregation {
    // In a real implementation, this would filter the aggregation by EventType.EXECUTION
    // For now, return the full aggregation assuming it contains execution data
    return aggregation;
  }
  
  /**
   * Categorize line values into budget and actual categories
   */
  private categorizeLineValue(
    templateLine: any, 
    budgetValue: number,
    actualValue: number,
    categories: BudgetVsActualCategories
  ): void {
    const lineCode = templateLine.lineCode.toUpperCase();
    const description = templateLine.description.toLowerCase();
    
    // Revenue categorization
    if (this.isRevenueItem(lineCode, description)) {
      categories.budget.revenues += budgetValue;
      categories.actual.revenues += actualValue;
    }
    
    // Expense categorization
    if (this.isExpenseItem(lineCode, description)) {
      categories.budget.expenses += Math.abs(budgetValue); // Ensure positive for expenses
      categories.actual.expenses += Math.abs(actualValue);
    }
  }
  
  /**
   * Calculate budget variance with favorability analysis
   */
  private calculateBudgetVariance(
    budgetValue: number, 
    actualValue: number, 
    templateLine: any
  ): {
    absolute: number;
    percentage: number;
    favorable: boolean;
  } {
    const absolute = actualValue - budgetValue;
    const percentage = budgetValue !== 0 ? (absolute / Math.abs(budgetValue)) * 100 : 0;
    
    // Determine if variance is favorable based on line type
    const isRevenueItem = this.isRevenueItem(templateLine.lineCode.toUpperCase(), templateLine.description.toLowerCase());
    const isExpenseItem = this.isExpenseItem(templateLine.lineCode.toUpperCase(), templateLine.description.toLowerCase());
    
    let favorable = false;
    if (isRevenueItem) {
      // For revenue, actual > budget is favorable
      favorable = actualValue > budgetValue;
    } else if (isExpenseItem) {
      // For expenses, actual < budget is favorable
      favorable = actualValue < budgetValue;
    } else {
      // For other items, assume actual > budget is favorable
      favorable = actualValue > budgetValue;
    }
    
    return {
      absolute: Math.round(absolute * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      favorable
    };
  }
  
  /**
   * Calculate computed totals and overall variances
   */
  private calculateComputedTotals(categories: BudgetVsActualCategories): void {
    // Calculate net budget and actual
    categories.budget.netBudget = categories.budget.revenues - categories.budget.expenses;
    categories.actual.netActual = categories.actual.revenues - categories.actual.expenses;
    
    // Calculate revenue variance
    const revenueVarianceAbs = categories.actual.revenues - categories.budget.revenues;
    categories.variances.revenueVariance = {
      absolute: Math.round(revenueVarianceAbs * 100) / 100,
      percentage: categories.budget.revenues !== 0 
        ? Math.round((revenueVarianceAbs / categories.budget.revenues) * 10000) / 100
        : 0,
      favorable: revenueVarianceAbs > 0 // Higher actual revenue is favorable
    };
    
    // Calculate expense variance
    const expenseVarianceAbs = categories.actual.expenses - categories.budget.expenses;
    categories.variances.expenseVariance = {
      absolute: Math.round(expenseVarianceAbs * 100) / 100,
      percentage: categories.budget.expenses !== 0 
        ? Math.round((expenseVarianceAbs / categories.budget.expenses) * 10000) / 100
        : 0,
      favorable: expenseVarianceAbs < 0 // Lower actual expenses is favorable
    };
    
    // Calculate net variance
    const netVarianceAbs = categories.actual.netActual - categories.budget.netBudget;
    categories.variances.netVariance = {
      absolute: Math.round(netVarianceAbs * 100) / 100,
      percentage: categories.budget.netBudget !== 0 
        ? Math.round((netVarianceAbs / Math.abs(categories.budget.netBudget)) * 10000) / 100
        : 0,
      favorable: netVarianceAbs > 0 // Higher actual net result is favorable
    };
  }
  
  /**
   * Add computed lines for totals and variances
   */
  private addComputedLines(lines: BudgetVsActualLine[], categories: BudgetVsActualCategories): void {
    const computedLines: BudgetVsActualLine[] = [
      // Revenue totals
      {
        id: 'BUDGET_VS_ACTUAL_TOTAL_REVENUE',
        description: 'Total Revenue',
        currentPeriodValue: categories.actual.revenues,
        previousPeriodValue: 0,
        budgetValue: categories.budget.revenues,
        actualValue: categories.actual.revenues,
        varianceAmount: categories.variances.revenueVariance.absolute,
        variancePercentage: categories.variances.revenueVariance.percentage,
        isFavorable: categories.variances.revenueVariance.favorable,
        variance: {
          absolute: categories.variances.revenueVariance.absolute,
          percentage: categories.variances.revenueVariance.percentage
        },
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
      
      // Expense totals
      {
        id: 'BUDGET_VS_ACTUAL_TOTAL_EXPENSES',
        description: 'Total Expenses',
        currentPeriodValue: categories.actual.expenses,
        previousPeriodValue: 0,
        budgetValue: categories.budget.expenses,
        actualValue: categories.actual.expenses,
        varianceAmount: categories.variances.expenseVariance.absolute,
        variancePercentage: categories.variances.expenseVariance.percentage,
        isFavorable: categories.variances.expenseVariance.favorable,
        variance: {
          absolute: categories.variances.expenseVariance.absolute,
          percentage: categories.variances.expenseVariance.percentage
        },
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 0,
          isSection: false,
          isSubtotal: true,
          isTotal: false
        },
        metadata: {
          lineCode: 'TOTAL_EXPENSES',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2000
        }
      },
      
      // Net result
      {
        id: 'BUDGET_VS_ACTUAL_NET_RESULT',
        description: categories.actual.netActual >= 0 ? 'Net Surplus' : 'Net Deficit',
        currentPeriodValue: categories.actual.netActual,
        previousPeriodValue: 0,
        budgetValue: categories.budget.netBudget,
        actualValue: categories.actual.netActual,
        varianceAmount: categories.variances.netVariance.absolute,
        variancePercentage: categories.variances.netVariance.percentage,
        isFavorable: categories.variances.netVariance.favorable,
        variance: {
          absolute: categories.variances.netVariance.absolute,
          percentage: categories.variances.netVariance.percentage
        },
        formatting: {
          bold: true,
          italic: categories.actual.netActual < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_RESULT',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3000
        }
      }
    ];
    
    lines.push(...computedLines);
  }
  
  /**
   * Validate budget vs actual reconciliation and business rules
   */
  private validateBudgetVsActual(
    categories: BudgetVsActualCategories,
    lines: BudgetVsActualLine[]
  ): ValidationResults {
    const businessRules: BusinessRuleValidation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Budget vs actual balance validation (should always balance by definition)
    const budgetActualBalance: BalanceValidation = {
      isValid: true,
      leftSide: categories.budget.netBudget,
      rightSide: categories.actual.netActual,
      difference: categories.variances.netVariance.absolute,
      equation: 'Budget vs Actual Variance Analysis'
    };
    
    // Rule 1: Budget data availability
    const hasBudgetData = categories.budget.revenues > 0 || categories.budget.expenses > 0;
    businessRules.push({
      ruleId: 'BUDGET_VS_ACTUAL_BUDGET_DATA',
      ruleName: 'Budget Data Availability',
      isValid: hasBudgetData,
      message: hasBudgetData 
        ? 'Budget data is available for comparison'
        : 'No budget data available - variance analysis not meaningful',
      affectedFields: ['TOTAL_REVENUE', 'TOTAL_EXPENSES']
    });
    
    // Rule 2: Actual data availability
    const hasActualData = categories.actual.revenues > 0 || categories.actual.expenses > 0;
    businessRules.push({
      ruleId: 'BUDGET_VS_ACTUAL_ACTUAL_DATA',
      ruleName: 'Actual Data Availability',
      isValid: hasActualData,
      message: hasActualData 
        ? 'Actual data is available for comparison'
        : 'No actual data available - variance analysis not meaningful',
      affectedFields: ['TOTAL_REVENUE', 'TOTAL_EXPENSES']
    });
    
    // Rule 3: Revenue variance reasonableness (within 50% of budget)
    const revenueVarianceReasonable = Math.abs(categories.variances.revenueVariance.percentage) <= 50;
    businessRules.push({
      ruleId: 'BUDGET_VS_ACTUAL_REVENUE_VARIANCE',
      ruleName: 'Revenue Variance Reasonableness',
      isValid: revenueVarianceReasonable,
      message: revenueVarianceReasonable
        ? `Revenue variance is reasonable (${categories.variances.revenueVariance.percentage.toFixed(1)}%)`
        : `Large revenue variance may indicate budget or data issues (${categories.variances.revenueVariance.percentage.toFixed(1)}%)`,
      affectedFields: ['TOTAL_REVENUE']
    });
    
    // Rule 4: Expense variance reasonableness (within 30% of budget)
    const expenseVarianceReasonable = Math.abs(categories.variances.expenseVariance.percentage) <= 30;
    businessRules.push({
      ruleId: 'BUDGET_VS_ACTUAL_EXPENSE_VARIANCE',
      ruleName: 'Expense Variance Reasonableness',
      isValid: expenseVarianceReasonable,
      message: expenseVarianceReasonable
        ? `Expense variance is reasonable (${categories.variances.expenseVariance.percentage.toFixed(1)}%)`
        : `Large expense variance may indicate budget or control issues (${categories.variances.expenseVariance.percentage.toFixed(1)}%)`,
      affectedFields: ['TOTAL_EXPENSES']
    });
    
    // Rule 5: Net variance calculation validation
    const expectedNetVariance = 
      categories.variances.revenueVariance.absolute - categories.variances.expenseVariance.absolute;
    const netVarianceCalculationValid = Math.abs(categories.variances.netVariance.absolute - expectedNetVariance) <= 0.01;
    
    businessRules.push({
      ruleId: 'BUDGET_VS_ACTUAL_NET_VARIANCE_CALC',
      ruleName: 'Net Variance Calculation',
      isValid: netVarianceCalculationValid,
      message: netVarianceCalculationValid
        ? 'Net variance calculation is correct'
        : 'Net variance calculation does not match revenue and expense variances',
      affectedFields: ['NET_RESULT']
    });
    
    // Warnings based on variance analysis
    if (categories.variances.revenueVariance.percentage < -20) {
      warnings.push(`Revenue significantly under budget (${categories.variances.revenueVariance.percentage.toFixed(1)}%)`);
    }
    
    if (categories.variances.expenseVariance.percentage > 20) {
      warnings.push(`Expenses significantly over budget (${categories.variances.expenseVariance.percentage.toFixed(1)}%)`);
    }
    
    if (!categories.variances.netVariance.favorable && Math.abs(categories.variances.netVariance.percentage) > 25) {
      warnings.push(`Unfavorable net variance indicates significant budget performance issues (${categories.variances.netVariance.percentage.toFixed(1)}%)`);
    }
    
    // Count unfavorable variances
    const unfavorableVariances = lines.filter(line => !line.isFavorable && Math.abs(line.variancePercentage) > 10);
    if (unfavorableVariances.length > lines.length * 0.3) {
      warnings.push(`${unfavorableVariances.length} line items have significant unfavorable variances`);
    }
    
    // Positive performance indicators
    if (categories.variances.revenueVariance.favorable && categories.variances.revenueVariance.percentage > 10) {
      warnings.push(`Revenue exceeded budget by ${categories.variances.revenueVariance.percentage.toFixed(1)}% - strong performance`);
    }
    
    if (categories.variances.expenseVariance.favorable && Math.abs(categories.variances.expenseVariance.percentage) > 10) {
      warnings.push(`Expenses under budget by ${Math.abs(categories.variances.expenseVariance.percentage).toFixed(1)}% - good cost control`);
    }
    
    // Errors for critical issues
    if (!hasBudgetData && !hasActualData) {
      errors.push('No budget or actual data available - cannot perform variance analysis');
    }
    
    if (categories.budget.revenues < 0 || categories.actual.revenues < 0) {
      errors.push('Negative revenue values detected - data integrity issue');
    }
    
    const isValid = businessRules.every(rule => rule.isValid) && errors.length === 0;
    
    return {
      isValid,
      accountingEquation: budgetActualBalance,
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
  
  private isExpenseItem(lineCode: string, description: string): boolean {
    const expenseKeywords = ['expense', 'expenditure', 'cost', 'salary', 'wage', 'supply', 'equipment'];
    const expenseLineCodes = ['EXP', 'COST', 'SAL', 'WAGE', 'SUPPLY', 'EQUIP'];
    
    return expenseLineCodes.some(code => lineCode.includes(code)) ||
           expenseKeywords.some(keyword => description.includes(keyword));
  }
  
  private isTotalLine(lineCode: string): boolean {
    const totalKeywords = ['TOTAL', 'SUM', 'NET'];
    return totalKeywords.some(keyword => lineCode.toUpperCase().includes(keyword));
  }
  
  private sortLinesByDisplayOrder(lines: BudgetVsActualLine[]): BudgetVsActualLine[] {
    return lines.sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);
  }
  
  private initializeCategories(): BudgetVsActualCategories {
    return {
      budget: {
        revenues: 0,
        expenses: 0,
        netBudget: 0
      },
      actual: {
        revenues: 0,
        expenses: 0,
        netActual: 0
      },
      variances: {
        revenueVariance: {
          absolute: 0,
          percentage: 0,
          favorable: false
        },
        expenseVariance: {
          absolute: 0,
          percentage: 0,
          favorable: false
        },
        netVariance: {
          absolute: 0,
          percentage: 0,
          favorable: false
        }
      }
    };
  }
}