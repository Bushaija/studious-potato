import { StatementLine, StatementTotals } from "./statement-generator";

export interface ValidationResults {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  accountingEquation: {
    isValid: boolean;
    leftSide: number;
    rightSide: number;
    difference: number;
  };
  completeness: {
    isValid: boolean;
    completionPercentage: number;
    missingFields: string[];
  };
  businessRules: {
    isValid: boolean;
    violations: Array<{
      rule: string;
      field: string;
      message: string;
    }>;
  };
}

export class StatementValidator {
  /**
   * Validate a complete statement
   */
  async validateStatement(
    lines: StatementLine[],
    totals: StatementTotals,
    statementCode: string
  ): Promise<ValidationResults> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Accounting equation validation
    const accountingEquation = this.validateAccountingEquation(totals, statementCode);
    if (!accountingEquation.isValid) {
      errors.push(`Accounting equation unbalanced: difference of ${accountingEquation.difference}`);
    }

    // 2. Completeness validation
    const completeness = this.validateCompleteness(lines);
    if (!completeness.isValid) {
      warnings.push(`Statement is ${completeness.completionPercentage}% complete`);
    }

    // 3. Business rules validation
    const businessRules = this.validateBusinessRules(lines, totals, statementCode);
    if (!businessRules.isValid) {
      errors.push(...businessRules.violations.map(v => v.message));
    }

    // 4. Statement-specific validations
    const statementSpecificValidation = this.validateStatementSpecificRules(lines, totals, statementCode);
    if (!statementSpecificValidation.isValid) {
      errors.push(...statementSpecificValidation.errors);
      warnings.push(...statementSpecificValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      accountingEquation,
      completeness,
      businessRules,
    };
  }

  /**
   * Validate accounting equation based on statement type
   */
  private validateAccountingEquation(totals: StatementTotals, statementCode: string): {
    isValid: boolean;
    leftSide: number;
    rightSide: number;
    difference: number;
  } {
    switch (statementCode) {
      case 'REV_EXP':
        // Revenue - Expenses = Surplus/Deficit
        const leftSide = totals.totalRevenue;
        const rightSide = totals.totalExpenses + totals.netSurplusDeficit;
        const difference = Math.abs(leftSide - rightSide);
        
        return {
          isValid: difference < 0.01, // Allow for rounding differences
          leftSide,
          rightSide,
          difference,
        };
      
      case 'ASSETS_LIAB':
        // Assets = Liabilities + Equity
        const assets = totals.totalAssets;
        const liabilities = totals.totalLiabilities;
        const netAssets = totals.netAssets;
        const assetsDifference = Math.abs(assets - (liabilities + netAssets));
        
        return {
          isValid: assetsDifference < 0.01,
          leftSide: assets,
          rightSide: liabilities + netAssets,
          difference: assetsDifference,
        };
      
      case 'CASH_FLOW':
        // Opening Cash + Net Cash Flow = Closing Cash
        // This would need more specific cash flow validation
        return {
          isValid: true,
          leftSide: 0,
          rightSide: 0,
          difference: 0,
        };
      
      default:
        return {
          isValid: true,
          leftSide: 0,
          rightSide: 0,
          difference: 0,
        };
    }
  }

  /**
   * Validate completeness of statement
   */
  private validateCompleteness(lines: StatementLine[]): {
    isValid: boolean;
    completionPercentage: number;
    missingFields: string[];
  } {
    const totalLines = lines.length;
    const completedLines = lines.filter(line => line.currentValue !== 0).length;
    const completionPercentage = totalLines > 0 ? (completedLines / totalLines) * 100 : 100;
    
    const missingFields = lines
      .filter(line => line.currentValue === 0 && line.isTotalLine)
      .map(line => line.lineCode);

    return {
      isValid: completionPercentage >= 80, // 80% completion threshold
      completionPercentage: Math.round(completionPercentage),
      missingFields,
    };
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    lines: StatementLine[],
    totals: StatementTotals,
    statementCode: string
  ): {
    isValid: boolean;
    violations: Array<{ rule: string; field: string; message: string }>;
  } {
    const violations: Array<{ rule: string; field: string; message: string }> = [];

    // Common business rules
    if (totals.totalRevenue < 0) {
      violations.push({
        rule: 'NON_NEGATIVE_REVENUE',
        field: 'total_revenue',
        message: 'Total revenue cannot be negative',
      });
    }

    if (totals.totalExpenses < 0) {
      violations.push({
        rule: 'NON_NEGATIVE_EXPENSES',
        field: 'total_expenses',
        message: 'Total expenses cannot be negative',
      });
    }

    // Statement-specific business rules
    switch (statementCode) {
      case 'REV_EXP':
        this.validateRevenueExpenditureRules(lines, totals, violations);
        break;
      
      case 'ASSETS_LIAB':
        this.validateBalanceSheetRules(lines, totals, violations);
        break;
      
      case 'CASH_FLOW':
        this.validateCashFlowRules(lines, totals, violations);
        break;
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validate Revenue & Expenditure specific rules
   */
  private validateRevenueExpenditureRules(
    lines: StatementLine[],
    totals: StatementTotals,
    violations: Array<{ rule: string; field: string; message: string }>
  ): void {
    // Rule: Surplus/Deficit should equal Revenue minus Expenses
    const calculatedSurplusDeficit = totals.totalRevenue - totals.totalExpenses;
    const surplusDeficitDifference = Math.abs(totals.netSurplusDeficit - calculatedSurplusDeficit);
    
    if (surplusDeficitDifference > 0.01) {
      violations.push({
        rule: 'SURPLUS_DEFICIT_CALCULATION',
        field: 'net_surplus_deficit',
        message: `Surplus/Deficit calculation mismatch: expected ${calculatedSurplusDeficit}, got ${totals.netSurplusDeficit}`,
      });
    }

    // Rule: All revenue lines should be non-negative
    const revenueLines = lines.filter(line => 
      line.lineItem.toLowerCase().includes('revenue') && 
      !line.lineItem.toLowerCase().includes('total')
    );
    
    for (const line of revenueLines) {
      if (line.currentValue < 0) {
        violations.push({
          rule: 'NON_NEGATIVE_REVENUE_LINE',
          field: line.lineCode,
          message: `Revenue line "${line.lineItem}" cannot be negative: ${line.currentValue}`,
        });
      }
    }
  }

  /**
   * Validate Balance Sheet specific rules
   */
  private validateBalanceSheetRules(
    lines: StatementLine[],
    totals: StatementTotals,
    violations: Array<{ rule: string; field: string; message: string }>
  ): void {
    // Rule: Assets should equal Liabilities plus Net Assets
    const calculatedAssets = totals.totalLiabilities + totals.netAssets;
    const assetsDifference = Math.abs(totals.totalAssets - calculatedAssets);
    
    if (assetsDifference > 0.01) {
      violations.push({
        rule: 'BALANCE_SHEET_EQUATION',
        field: 'total_assets',
        message: `Balance sheet equation unbalanced: Assets (${totals.totalAssets}) ≠ Liabilities + Net Assets (${calculatedAssets})`,
      });
    }

    // Rule: All asset lines should be non-negative
    const assetLines = lines.filter(line => 
      line.lineItem.toLowerCase().includes('asset') && 
      !line.lineItem.toLowerCase().includes('total')
    );
    
    for (const line of assetLines) {
      if (line.currentValue < 0) {
        violations.push({
          rule: 'NON_NEGATIVE_ASSET_LINE',
          field: line.lineCode,
          message: `Asset line "${line.lineItem}" cannot be negative: ${line.currentValue}`,
        });
      }
    }
  }

  /**
   * Validate Cash Flow specific rules
   */
  private validateCashFlowRules(
    lines: StatementLine[],
    totals: StatementTotals,
    violations: Array<{ rule: string; field: string; message: string }>
  ): void {
    // Rule: Net cash flow should equal cash inflow minus cash outflow
    const netCashFlow = totals.totalRevenue - totals.totalExpenses; // Simplified
    const netCashFlowDifference = Math.abs(totals.netSurplusDeficit - netCashFlow);
    
    if (netCashFlowDifference > 0.01) {
      violations.push({
        rule: 'CASH_FLOW_CALCULATION',
        field: 'net_cash_flow',
        message: `Cash flow calculation mismatch: expected ${netCashFlow}, got ${totals.netSurplusDeficit}`,
      });
    }
  }

  /**
   * Validate statement-specific rules
   */
  private validateStatementSpecificRules(
    lines: StatementLine[],
    totals: StatementTotals,
    statementCode: string
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty total lines
    const totalLines = lines.filter(line => line.isTotalLine);
    for (const line of totalLines) {
      if (line.currentValue === 0) {
        warnings.push(`Total line "${line.lineItem}" has zero value`);
      }
    }

    // Check for negative values in inappropriate places
    const inappropriateNegativeLines = lines.filter(line => 
      line.currentValue < 0 && 
      (line.lineItem.toLowerCase().includes('revenue') || 
       line.lineItem.toLowerCase().includes('asset'))
    );
    
    for (const line of inappropriateNegativeLines) {
      warnings.push(`Line "${line.lineItem}" has negative value: ${line.currentValue}`);
    }

    // Check for missing note numbers on important lines
    const importantLines = lines.filter(line => 
      line.isTotalLine || 
      line.lineItem.toLowerCase().includes('total') ||
      Math.abs(line.currentValue) > 1000
    );
    
    for (const line of importantLines) {
      if (!line.noteNumber) {
        warnings.push(`Important line "${line.lineItem}" is missing note number`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}