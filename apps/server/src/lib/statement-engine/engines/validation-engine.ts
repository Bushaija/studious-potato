/**
 * Validation Engine
 * Handles accounting equation validation and business rule validation
 */

import { 
  ValidationResults,
  BalanceValidation,
  BusinessRuleValidation,
  StatementLine
} from "../types/core.types";
import { FinancialStatement } from "../types/engine.types";

export interface ValidationEngine {
  validateAccountingEquation(statement: FinancialStatement): BalanceValidation;
  validateBusinessRules(statement: FinancialStatement): BusinessRuleValidation[];
  validateStatementBalance(statement: FinancialStatement): ValidationResults;
}

export interface BusinessRule {
  id: string;
  name: string;
  statementTypes: string[];
  condition: (statement: FinancialStatement) => boolean;
  message: string;
  severity: 'error' | 'warning';
  affectedFields: string[];
}

export class StatementValidationEngine implements ValidationEngine {
  private businessRules: BusinessRule[] = [];

  constructor() {
    this.initializeBusinessRules();
  }

  /**
   * Validate accounting equation for different statement types
   */
  validateAccountingEquation(statement: FinancialStatement): BalanceValidation {
    switch (statement.statementCode) {
      case 'BAL_SHEET':
        return this.validateBalanceSheetEquation(statement);
      
      case 'CASH_FLOW':
        return this.validateCashFlowBalance(statement);
      
      case 'REV_EXP':
        return this.validateRevenueExpenditureBalance(statement);
      
      case 'NET_ASSETS':
        return this.validateNetAssetsBalance(statement);
      
      case 'BUDGET_VS_ACTUAL':
        return this.validateBudgetActualBalance(statement);
      
      default:
        return {
          isValid: true,
          leftSide: 0,
          rightSide: 0,
          difference: 0,
          equation: 'No specific equation validation for this statement type'
        };
    }
  }

  /**
   * Validate business rules for the statement
   */
  validateBusinessRules(statement: FinancialStatement): BusinessRuleValidation[] {
    const results: BusinessRuleValidation[] = [];

    for (const rule of this.businessRules) {
      // Check if rule applies to this statement type
      if (!rule.statementTypes.includes(statement.statementCode)) {
        continue;
      }

      try {
        const isValid = rule.condition(statement);
        
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          isValid,
          message: isValid ? `${rule.name} validation passed` : rule.message,
          affectedFields: rule.affectedFields
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          isValid: false,
          message: `Error validating ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          affectedFields: rule.affectedFields
        });
      }
    }

    return results;
  }

  /**
   * Comprehensive statement balance validation
   */
  validateStatementBalance(statement: FinancialStatement): ValidationResults {
    const accountingEquation = this.validateAccountingEquation(statement);
    const businessRules = this.validateBusinessRules(statement);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check accounting equation
    if (!accountingEquation.isValid) {
      errors.push(`Accounting equation validation failed: ${accountingEquation.equation}`);
    }

    // Process business rule results
    for (const rule of businessRules) {
      if (!rule.isValid) {
        if (rule.ruleId.includes('WARNING')) {
          warnings.push(rule.message);
        } else {
          errors.push(rule.message);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      accountingEquation,
      businessRules,
      warnings,
      errors
    };
  }

  /**
   * Add custom business rule
   */
  addBusinessRule(rule: BusinessRule): void {
    this.businessRules.push(rule);
  }

  /**
   * Remove business rule by ID
   */
  removeBusinessRule(ruleId: string): void {
    this.businessRules = this.businessRules.filter(rule => rule.id !== ruleId);
  }

  // Private validation methods for specific statement types

  private validateBalanceSheetEquation(statement: FinancialStatement): BalanceValidation {
    const totalAssets = this.getTotalByCode(statement, 'TOTAL_ASSETS');
    const totalLiabilities = this.getTotalByCode(statement, 'TOTAL_LIABILITIES');
    const totalEquity = this.getTotalByCode(statement, 'TOTAL_EQUITY');

    const rightSide = totalLiabilities + totalEquity;
    const difference = totalAssets - rightSide;
    const tolerance = 0.01;

    return {
      isValid: Math.abs(difference) <= tolerance,
      leftSide: totalAssets,
      rightSide: rightSide,
      difference: difference,
      equation: 'Assets = Liabilities + Equity'
    };
  }

  private validateCashFlowBalance(statement: FinancialStatement): BalanceValidation {
    const operatingCashFlow = this.getTotalByCode(statement, 'OPERATING_CASH_FLOW');
    const investingCashFlow = this.getTotalByCode(statement, 'INVESTING_CASH_FLOW');
    const financingCashFlow = this.getTotalByCode(statement, 'FINANCING_CASH_FLOW');
    const netCashFlow = this.getTotalByCode(statement, 'NET_CASH_FLOW');

    const calculatedNetCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const difference = netCashFlow - calculatedNetCashFlow;
    const tolerance = 0.01;

    return {
      isValid: Math.abs(difference) <= tolerance,
      leftSide: netCashFlow,
      rightSide: calculatedNetCashFlow,
      difference: difference,
      equation: 'Net Cash Flow = Operating + Investing + Financing Cash Flows'
    };
  }

  private validateRevenueExpenditureBalance(statement: FinancialStatement): BalanceValidation {
    const totalRevenue = this.getTotalByCode(statement, 'TOTAL_REVENUE');
    const totalExpenses = this.getTotalByCode(statement, 'TOTAL_EXPENSES');
    const netSurplus = this.getTotalByCode(statement, 'NET_SURPLUS_DEFICIT');

    const calculatedSurplus = totalRevenue - totalExpenses;
    const difference = netSurplus - calculatedSurplus;
    const tolerance = 0.01;

    return {
      isValid: Math.abs(difference) <= tolerance,
      leftSide: netSurplus,
      rightSide: calculatedSurplus,
      difference: difference,
      equation: 'Net Surplus/Deficit = Total Revenue - Total Expenses'
    };
  }

  private validateNetAssetsBalance(statement: FinancialStatement): BalanceValidation {
    const beginningNetAssets = this.getTotalByCode(statement, 'BEGINNING_NET_ASSETS');
    const changeInNetAssets = this.getTotalByCode(statement, 'CHANGE_IN_NET_ASSETS');
    const endingNetAssets = this.getTotalByCode(statement, 'ENDING_NET_ASSETS');

    const calculatedEndingAssets = beginningNetAssets + changeInNetAssets;
    const difference = endingNetAssets - calculatedEndingAssets;
    const tolerance = 0.01;

    return {
      isValid: Math.abs(difference) <= tolerance,
      leftSide: endingNetAssets,
      rightSide: calculatedEndingAssets,
      difference: difference,
      equation: 'Ending Net Assets = Beginning Net Assets + Change in Net Assets'
    };
  }

  private validateBudgetActualBalance(statement: FinancialStatement): BalanceValidation {
    // For budget vs actual, we validate that variances are calculated correctly
    let totalVarianceErrors = 0;
    let checkedLines = 0;

    for (const line of statement.lines) {
      if (line.variance && line.currentPeriodValue !== 0 && line.previousPeriodValue !== 0) {
        const expectedAbsolute = line.currentPeriodValue - line.previousPeriodValue;
        const expectedPercentage = line.previousPeriodValue !== 0 ? 
          (expectedAbsolute / Math.abs(line.previousPeriodValue)) * 100 : 0;

        const absoluteError = Math.abs(line.variance.absolute - expectedAbsolute);
        const percentageError = Math.abs(line.variance.percentage - expectedPercentage);

        if (absoluteError > 0.01 || percentageError > 0.01) {
          totalVarianceErrors++;
        }
        checkedLines++;
      }
    }

    return {
      isValid: totalVarianceErrors === 0,
      leftSide: checkedLines,
      rightSide: checkedLines - totalVarianceErrors,
      difference: totalVarianceErrors,
      equation: 'All variance calculations must be accurate'
    };
  }

  private getTotalByCode(statement: FinancialStatement, code: string): number {
    return statement.totals[code] || 0;
  }

  private getLineByCode(statement: FinancialStatement, lineCode: string): StatementLine | undefined {
    return statement.lines.find((line: StatementLine) => line.metadata.lineCode === lineCode);
  }

  /**
   * Initialize default business rules
   */
  private initializeBusinessRules(): void {
    // Working Capital Rules (Requirements: 7.1, 7.2, 7.3, 7.4)
    this.businessRules.push({
      id: 'WC_NEGATIVE_RECEIVABLES',
      name: 'Working Capital Negative Receivables Balance',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        // Check if working capital metadata exists and has receivables data
        const metadata = statement.metadata as any;
        if (!metadata?.workingCapital?.receivables) {
          return true; // No working capital data, skip validation
        }
        
        const currentReceivables = metadata.workingCapital.receivables.currentBalance;
        return currentReceivables >= 0;
      },
      message: 'Negative receivables balance detected. This may indicate data quality issues.',
      severity: 'error',
      affectedFields: ['CHANGES_RECEIVABLES']
    });

    this.businessRules.push({
      id: 'WC_EXTREME_RECEIVABLES_VARIANCE',
      name: 'Working Capital Extreme Receivables Variance',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        const metadata = statement.metadata as any;
        if (!metadata?.workingCapital?.receivables) {
          return true;
        }
        
        const { previousBalance, change } = metadata.workingCapital.receivables;
        
        // Skip if previous balance is zero (first period)
        if (previousBalance === 0) {
          return true;
        }
        
        const variance = Math.abs(change / previousBalance);
        return variance <= 1.0; // 100% threshold
      },
      message: 'Significant variance in receivables detected (>100% change). Please review the underlying data.',
      severity: 'warning',
      affectedFields: ['CHANGES_RECEIVABLES']
    });

    this.businessRules.push({
      id: 'WC_EXTREME_PAYABLES_VARIANCE',
      name: 'Working Capital Extreme Payables Variance',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        const metadata = statement.metadata as any;
        if (!metadata?.workingCapital?.payables) {
          return true;
        }
        
        const { previousBalance, change } = metadata.workingCapital.payables;
        
        // Skip if previous balance is zero (first period)
        if (previousBalance === 0) {
          return true;
        }
        
        const variance = Math.abs(change / previousBalance);
        return variance <= 1.0; // 100% threshold
      },
      message: 'Significant variance in payables detected (>100% change). Please review the underlying data.',
      severity: 'warning',
      affectedFields: ['CHANGES_PAYABLES']
    });

    this.businessRules.push({
      id: 'WC_MISSING_PREVIOUS_PERIOD',
      name: 'Working Capital Missing Previous Period',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        const metadata = statement.metadata as any;
        if (!metadata?.workingCapital) {
          return true;
        }
        
        // Check if previous period data exists
        const hasPreviousPeriod = metadata.workingCapital.receivables?.previousBalance !== undefined &&
                                  metadata.workingCapital.payables?.previousBalance !== undefined;
        
        // Also check warnings for missing previous period message
        const warnings = metadata.workingCapital.warnings || [];
        const hasMissingPeriodWarning = warnings.some((w: string) => 
          w.includes('previous period') || w.includes('baseline')
        );
        
        return hasPreviousPeriod && !hasMissingPeriodWarning;
      },
      message: 'Previous period data not available for working capital calculation. Using zero as baseline.',
      severity: 'warning',
      affectedFields: ['CHANGES_RECEIVABLES', 'CHANGES_PAYABLES']
    });

    this.businessRules.push({
      id: 'WC_INCONSISTENT_BALANCE_SHEET_DATA',
      name: 'Working Capital Inconsistent Balance Sheet Data',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        const metadata = statement.metadata as any;
        if (!metadata?.workingCapital) {
          return true;
        }
        
        const { receivables, payables } = metadata.workingCapital;
        
        // Check for negative payables (liability should be positive)
        if (payables && payables.currentBalance < 0) {
          return false;
        }
        
        // Check for extremely large values that might indicate data errors
        const maxReasonableValue = 1000000000; // 1 billion
        if (receivables && Math.abs(receivables.currentBalance) > maxReasonableValue) {
          return false;
        }
        if (payables && Math.abs(payables.currentBalance) > maxReasonableValue) {
          return false;
        }
        
        return true;
      },
      message: 'Inconsistent balance sheet data detected in working capital accounts. Please verify the data integrity.',
      severity: 'error',
      affectedFields: ['CHANGES_RECEIVABLES', 'CHANGES_PAYABLES']
    });

    // Balance Sheet Rules
    this.businessRules.push({
      id: 'BS_POSITIVE_ASSETS',
      name: 'Balance Sheet Positive Assets',
      statementTypes: ['BAL_SHEET'],
      condition: (statement) => {
        const totalAssets = this.getTotalByCode(statement, 'TOTAL_ASSETS');
        return totalAssets >= 0;
      },
      message: 'Total assets cannot be negative',
      severity: 'error',
      affectedFields: ['TOTAL_ASSETS']
    });

    this.businessRules.push({
      id: 'BS_EQUITY_REASONABLE',
      name: 'Balance Sheet Reasonable Equity',
      statementTypes: ['BAL_SHEET'],
      condition: (statement) => {
        const totalAssets = this.getTotalByCode(statement, 'TOTAL_ASSETS');
        const totalEquity = this.getTotalByCode(statement, 'TOTAL_EQUITY');
        
        if (totalAssets === 0) return true;
        
        const equityRatio = Math.abs(totalEquity / totalAssets);
        return equityRatio <= 2.0; // Equity shouldn't be more than 200% of assets
      },
      message: 'Equity ratio appears unreasonable (>200% of assets)',
      severity: 'warning',
      affectedFields: ['TOTAL_EQUITY', 'TOTAL_ASSETS']
    });

    // Revenue & Expenditure Rules
    this.businessRules.push({
      id: 'RE_POSITIVE_REVENUE',
      name: 'Revenue Expenditure Positive Revenue',
      statementTypes: ['REV_EXP'],
      condition: (statement) => {
        const totalRevenue = this.getTotalByCode(statement, 'TOTAL_REVENUE');
        return totalRevenue >= 0;
      },
      message: 'Total revenue should not be negative',
      severity: 'warning',
      affectedFields: ['TOTAL_REVENUE']
    });

    this.businessRules.push({
      id: 'RE_POSITIVE_EXPENSES',
      name: 'Revenue Expenditure Positive Expenses',
      statementTypes: ['REV_EXP'],
      condition: (statement) => {
        const totalExpenses = this.getTotalByCode(statement, 'TOTAL_EXPENSES');
        return totalExpenses >= 0;
      },
      message: 'Total expenses should not be negative',
      severity: 'warning',
      affectedFields: ['TOTAL_EXPENSES']
    });

    // Cash Flow Rules
    this.businessRules.push({
      id: 'CF_REASONABLE_OPERATING',
      name: 'Cash Flow Reasonable Operating Flow',
      statementTypes: ['CASH_FLOW'],
      condition: (statement) => {
        const operatingCashFlow = this.getTotalByCode(statement, 'OPERATING_CASH_FLOW');
        const totalRevenue = this.getTotalByCode(statement, 'TOTAL_REVENUE');
        
        if (totalRevenue === 0) return true;
        
        const operatingRatio = Math.abs(operatingCashFlow / totalRevenue);
        return operatingRatio <= 3.0; // Operating cash flow shouldn't be more than 300% of revenue
      },
      message: 'Operating cash flow appears unreasonable compared to revenue',
      severity: 'warning',
      affectedFields: ['OPERATING_CASH_FLOW']
    });

    // Budget vs Actual Rules
    this.businessRules.push({
      id: 'BVA_VARIANCE_CALCULATION',
      name: 'Budget vs Actual Variance Calculation',
      statementTypes: ['BUDGET_VS_ACTUAL'],
      condition: (statement) => {
        for (const line of statement.lines) {
          if (line.variance && (line.currentPeriodValue !== 0 || line.previousPeriodValue !== 0)) {
            const expectedAbsolute = line.currentPeriodValue - line.previousPeriodValue;
            const absoluteError = Math.abs(line.variance.absolute - expectedAbsolute);
            
            if (absoluteError > 0.01) {
              return false;
            }
          }
        }
        return true;
      },
      message: 'One or more variance calculations are incorrect',
      severity: 'error',
      affectedFields: ['variance']
    });

    // General Rules
    this.businessRules.push({
      id: 'GEN_NO_EXTREME_VALUES',
      name: 'General No Extreme Values',
      statementTypes: ['REV_EXP', 'BAL_SHEET', 'CASH_FLOW', 'NET_ASSETS', 'BUDGET_VS_ACTUAL'],
      condition: (statement) => {
        const maxReasonableValue = 1000000000; // 1 billion
        
        for (const line of statement.lines) {
          if (Math.abs(line.currentPeriodValue) > maxReasonableValue ||
              Math.abs(line.previousPeriodValue) > maxReasonableValue) {
            return false;
          }
        }
        
        for (const total of Object.values(statement.totals)) {
          if (Math.abs(Number(total)) > maxReasonableValue) {
            return false;
          }
        }
        
        return true;
      },
      message: 'Statement contains extremely large values that may indicate data errors',
      severity: 'warning',
      affectedFields: ['all_values']
    });
  }
}