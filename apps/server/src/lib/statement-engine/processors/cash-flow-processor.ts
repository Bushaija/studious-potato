/**
 * Cash Flow Statement Processor
 * Handles CASH_FLOW statement-specific logic including operating/investing/financing sections
 * and cash flow balance validation
 */

import {
  StatementTemplate,
  StatementLine,
  ValidationResults,
  BusinessRuleValidation,
  BalanceValidation
} from "../types/core.types";
import { EventAggregation } from "../types/engine.types";

export interface CashFlowCategories {
  operating: {
    cashReceipts: number;
    cashPayments: number;
    netOperatingCashFlow: number;
  };
  investing: {
    assetPurchases: number;
    assetSales: number;
    netInvestingCashFlow: number;
  };
  financing: {
    borrowings: number;
    repayments: number;
    capitalContributions: number;
    netFinancingCashFlow: number;
  };
  summary: {
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
}

export class CashFlowProcessor {

  /**
   * Process CASH_FLOW statement with operating/investing/financing categorization
   */
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation
  ): {
    lines: StatementLine[];
    categories: CashFlowCategories;
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
        id: `CASH_FLOW_${templateLine.lineCode}`,
        description: templateLine.description,
        currentPeriodValue: currentValue,
        previousPeriodValue: previousValue,
        variance: this.calculateVariance(currentValue, previousValue),
        formatting: {
          ...templateLine.formatting,
          // Enhance formatting for cash flow display
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

    // Calculate computed totals and net cash flows
    this.calculateComputedTotals(categories);

    // Add computed lines for totals and sections
    this.addComputedLines(lines, categories);

    // Validate cash flow balance and business rules
    const validation = this.validateCashFlow(categories, lines);

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
      const eventTotal = aggregation.eventTotals.get(eventCode) || 0;
      console.log(`[CashFlowProcessor] Event ${eventCode}: ${eventTotal}`);
      total += aggregation.eventTotals.get(eventCode) || 0;
    }

    return total;
  }

  /**
   * Categorize line value into operating, investing, or financing activities
   */
  private categorizeLineValue(
    templateLine: any,
    value: number,
    categories: CashFlowCategories
  ): void {
    const lineCode = templateLine.lineCode.toUpperCase();
    const description = templateLine.description.toLowerCase();

    // Operating activities categorization
    if (this.isOperatingActivity(lineCode, description)) {
      if (this.isCashReceipt(lineCode, description)) {
        categories.operating.cashReceipts += Math.abs(value); // Ensure positive for receipts
      } else if (this.isCashPayment(lineCode, description)) {
        categories.operating.cashPayments += Math.abs(value); // Ensure positive for payments
      }
    }

    // Investing activities categorization
    if (this.isInvestingActivity(lineCode, description)) {
      if (this.isAssetPurchase(lineCode, description)) {
        categories.investing.assetPurchases += Math.abs(value); // Ensure positive for purchases
      } else if (this.isAssetSale(lineCode, description)) {
        categories.investing.assetSales += Math.abs(value); // Ensure positive for sales
      }
    }

    // Financing activities categorization
    if (this.isFinancingActivity(lineCode, description)) {
      if (this.isBorrowing(lineCode, description)) {
        categories.financing.borrowings += Math.abs(value);
      } else if (this.isRepayment(lineCode, description)) {
        categories.financing.repayments += Math.abs(value);
      } else if (this.isCapitalContribution(lineCode, description)) {
        categories.financing.capitalContributions += Math.abs(value);
      }
    }

    // Cash balance items
    if (this.isBeginningCash(lineCode, description)) {
      categories.summary.beginningCash = value;
    } else if (this.isEndingCash(lineCode, description)) {
      categories.summary.endingCash = value;
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
   * Calculate computed totals and net cash flows
   */
  private calculateComputedTotals(categories: CashFlowCategories): void {
    // Calculate net operating cash flow (receipts - payments)
    categories.operating.netOperatingCashFlow =
      categories.operating.cashReceipts - categories.operating.cashPayments;

    // Calculate net investing cash flow (sales - purchases)
    categories.investing.netInvestingCashFlow =
      categories.investing.assetSales - categories.investing.assetPurchases;

    // Calculate net financing cash flow (borrowings + contributions - repayments)
    categories.financing.netFinancingCashFlow =
      categories.financing.borrowings + categories.financing.capitalContributions - categories.financing.repayments;

    // Calculate total net cash flow
    categories.summary.netCashFlow =
      categories.operating.netOperatingCashFlow +
      categories.investing.netInvestingCashFlow +
      categories.financing.netFinancingCashFlow;

    // If ending cash is not provided, calculate it
    if (categories.summary.endingCash === 0 && categories.summary.beginningCash !== 0) {
      categories.summary.endingCash = categories.summary.beginningCash + categories.summary.netCashFlow;
    }
  }

  /**
   * Add computed lines for totals and sections
   */
  private addComputedLines(lines: StatementLine[], categories: CashFlowCategories): void {
    const computedLines: StatementLine[] = [
      // Operating activities section
      {
        id: 'CASH_FLOW_NET_OPERATING',
        description: 'Net Cash Flow from Operating Activities',
        currentPeriodValue: categories.operating.netOperatingCashFlow,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.operating.netOperatingCashFlow < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_OPERATING_CASH_FLOW',
          eventCodes: [],
          isComputed: true,
          displayOrder: 1000
        }
      },

      // Investing activities section
      {
        id: 'CASH_FLOW_NET_INVESTING',
        description: 'Net Cash Flow from Investing Activities',
        currentPeriodValue: categories.investing.netInvestingCashFlow,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.investing.netInvestingCashFlow < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_INVESTING_CASH_FLOW',
          eventCodes: [],
          isComputed: true,
          displayOrder: 2000
        }
      },

      // Financing activities section
      {
        id: 'CASH_FLOW_NET_FINANCING',
        description: 'Net Cash Flow from Financing Activities',
        currentPeriodValue: categories.financing.netFinancingCashFlow,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.financing.netFinancingCashFlow < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_FINANCING_CASH_FLOW',
          eventCodes: [],
          isComputed: true,
          displayOrder: 3000
        }
      },

      // Summary section
      {
        id: 'CASH_FLOW_NET_CHANGE',
        description: 'Net Change in Cash',
        currentPeriodValue: categories.summary.netCashFlow,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: categories.summary.netCashFlow < 0,
          indentLevel: 0,
          isSection: true,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'NET_CHANGE_CASH',
          eventCodes: [],
          isComputed: true,
          displayOrder: 4000
        }
      },

      {
        id: 'CASH_FLOW_BEGINNING_CASH',
        description: 'Cash at Beginning of Period',
        currentPeriodValue: categories.summary.beginningCash,
        previousPeriodValue: 0,
        formatting: {
          bold: false,
          italic: false,
          indentLevel: 0,
          isSection: false,
          isSubtotal: false,
          isTotal: false
        },
        metadata: {
          lineCode: 'BEGINNING_CASH',
          eventCodes: [],
          isComputed: true,
          displayOrder: 4100
        }
      },

      {
        id: 'CASH_FLOW_ENDING_CASH',
        description: 'Cash at End of Period',
        currentPeriodValue: categories.summary.endingCash,
        previousPeriodValue: 0,
        formatting: {
          bold: true,
          italic: false,
          indentLevel: 0,
          isSection: false,
          isSubtotal: false,
          isTotal: true
        },
        metadata: {
          lineCode: 'ENDING_CASH',
          eventCodes: [],
          isComputed: true,
          displayOrder: 4200
        }
      }
    ];

    lines.push(...computedLines);
  }

  /**
   * Validate cash flow balance and business rules
   */
  private validateCashFlow(
    categories: CashFlowCategories,
    _lines: StatementLine[]
  ): ValidationResults {
    const businessRules: BusinessRuleValidation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Calculate cash flow balance validation
    const expectedEndingCash = categories.summary.beginningCash + categories.summary.netCashFlow;
    const cashBalanceDifference = categories.summary.endingCash - expectedEndingCash;
    const tolerance = 0.01; // Allow for rounding differences

    const cashBalanceValid = Math.abs(cashBalanceDifference) <= tolerance;

    const cashFlowBalance: BalanceValidation = {
      isValid: cashBalanceValid,
      leftSide: categories.summary.beginningCash + categories.summary.netCashFlow,
      rightSide: categories.summary.endingCash,
      difference: Math.round(cashBalanceDifference * 100) / 100,
      equation: 'Beginning Cash + Net Cash Flow = Ending Cash'
    };

    // Rule 1: Cash flow balance validation
    businessRules.push({
      ruleId: 'CASH_FLOW_BALANCE',
      ruleName: 'Cash Flow Balance Check',
      isValid: cashBalanceValid,
      message: cashBalanceValid
        ? 'Cash flow balances correctly'
        : `Cash flow does not balance (difference: ${cashBalanceDifference.toFixed(2)})`,
      affectedFields: ['BEGINNING_CASH', 'NET_CHANGE_CASH', 'ENDING_CASH']
    });

    // Rule 2: Net cash flow calculation validation
    const expectedNetCashFlow =
      categories.operating.netOperatingCashFlow +
      categories.investing.netInvestingCashFlow +
      categories.financing.netFinancingCashFlow;
    const netCashFlowValid = Math.abs(categories.summary.netCashFlow - expectedNetCashFlow) <= tolerance;

    businessRules.push({
      ruleId: 'CASH_FLOW_NET_CALCULATION',
      ruleName: 'Net Cash Flow Calculation',
      isValid: netCashFlowValid,
      message: netCashFlowValid
        ? 'Net cash flow calculation is correct'
        : 'Net cash flow calculation does not match sum of activities',
      affectedFields: ['NET_OPERATING_CASH_FLOW', 'NET_INVESTING_CASH_FLOW', 'NET_FINANCING_CASH_FLOW', 'NET_CHANGE_CASH']
    });

    // Rule 3: Operating cash flow reasonableness
    const operatingCashFlowReasonable = categories.operating.cashReceipts > 0 || categories.operating.cashPayments > 0;
    businessRules.push({
      ruleId: 'CASH_FLOW_OPERATING_ACTIVITY',
      ruleName: 'Operating Activity Check',
      isValid: operatingCashFlowReasonable,
      message: operatingCashFlowReasonable
        ? 'Operating cash flow activities are present'
        : 'No operating cash flow activities recorded',
      affectedFields: ['NET_OPERATING_CASH_FLOW']
    });

    // Rule 4: Cash receipts vs payments balance
    if (categories.operating.cashReceipts > 0 && categories.operating.cashPayments > 0) {
      const receiptPaymentRatio = categories.operating.cashReceipts / categories.operating.cashPayments;
      const ratioReasonable = receiptPaymentRatio > 0.1 && receiptPaymentRatio < 10; // Between 10% and 1000%

      businessRules.push({
        ruleId: 'CASH_FLOW_RECEIPT_PAYMENT_RATIO',
        ruleName: 'Receipt to Payment Ratio Check',
        isValid: ratioReasonable,
        message: ratioReasonable
          ? `Receipt to payment ratio is reasonable (${receiptPaymentRatio.toFixed(2)})`
          : `Receipt to payment ratio may indicate data issues (${receiptPaymentRatio.toFixed(2)})`,
        affectedFields: ['CASH_RECEIPTS', 'CASH_PAYMENTS']
      });
    }

    // Warnings
    if (categories.operating.netOperatingCashFlow < 0) {
      warnings.push('Negative operating cash flow may indicate operational challenges');
    }

    if (categories.summary.netCashFlow < 0 && Math.abs(categories.summary.netCashFlow) > categories.summary.beginningCash * 0.5) {
      warnings.push('Large negative cash flow relative to beginning cash balance');
    }

    if (categories.investing.netInvestingCashFlow > 0 && categories.investing.assetPurchases === 0) {
      warnings.push('Positive investing cash flow with no asset purchases may indicate asset sales');
    }

    if (categories.financing.netFinancingCashFlow < 0 && categories.financing.repayments > categories.financing.borrowings) {
      warnings.push('Net debt repayment may indicate deleveraging strategy');
    }

    // Errors
    if (Math.abs(cashBalanceDifference) > 100) {
      errors.push(`Significant cash flow imbalance: ${cashBalanceDifference.toFixed(2)}`);
    }

    if (categories.summary.endingCash < 0 && Math.abs(categories.summary.endingCash) > 1000) {
      errors.push('Large negative ending cash balance indicates potential liquidity issues');
    }

    const isValid = businessRules.every(rule => rule.isValid) && errors.length === 0;

    return {
      isValid,
      accountingEquation: cashFlowBalance,
      businessRules,
      warnings,
      errors
    };
  }

  /**
   * Helper methods for categorization
   */
  private isOperatingActivity(lineCode: string, description: string): boolean {
    const operatingKeywords = ['receipt', 'payment', 'customer', 'supplier', 'employee', 'salary', 'service'];
    const operatingLineCodes = ['OPER', 'RCPT', 'PAY', 'CUST', 'SUPP', 'SAL'];

    return operatingLineCodes.some(code => lineCode.includes(code)) ||
      operatingKeywords.some(keyword => description.includes(keyword));
  }

  private isInvestingActivity(lineCode: string, description: string): boolean {
    const investingKeywords = ['asset', 'equipment', 'building', 'investment', 'purchase', 'sale'];
    const investingLineCodes = ['INV', 'ASSET', 'EQUIP', 'BLDG', 'PURCH', 'SALE'];

    return investingLineCodes.some(code => lineCode.includes(code)) ||
      investingKeywords.some(keyword => description.includes(keyword));
  }

  private isFinancingActivity(lineCode: string, description: string): boolean {
    const financingKeywords = ['loan', 'borrow', 'repay', 'capital', 'equity', 'debt'];
    const financingLineCodes = ['FIN', 'LOAN', 'BORR', 'REPAY', 'CAP', 'DEBT'];

    return financingLineCodes.some(code => lineCode.includes(code)) ||
      financingKeywords.some(keyword => description.includes(keyword));
  }

  private isCashReceipt(lineCode: string, description: string): boolean {
    const receiptKeywords = ['receipt', 'received', 'collection', 'income', 'revenue'];
    return receiptKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('RCPT') || lineCode.includes('REC');
  }

  private isCashPayment(lineCode: string, description: string): boolean {
    const paymentKeywords = ['payment', 'paid', 'expense', 'cost'];
    return paymentKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('PAY') || lineCode.includes('EXP');
  }

  private isAssetPurchase(lineCode: string, description: string): boolean {
    const purchaseKeywords = ['purchase', 'acquisition', 'buy', 'bought'];
    return purchaseKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('PURCH') || lineCode.includes('ACQ');
  }

  private isAssetSale(lineCode: string, description: string): boolean {
    const saleKeywords = ['sale', 'disposal', 'sell', 'sold'];
    return saleKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('SALE') || lineCode.includes('DISP');
  }

  private isBorrowing(lineCode: string, description: string): boolean {
    const borrowKeywords = ['borrow', 'loan', 'advance'];
    return borrowKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('BORR') || lineCode.includes('LOAN');
  }

  private isRepayment(lineCode: string, description: string): boolean {
    const repayKeywords = ['repay', 'repayment', 'principal'];
    return repayKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('REPAY') || lineCode.includes('PRIN');
  }

  private isCapitalContribution(lineCode: string, description: string): boolean {
    const capitalKeywords = ['capital', 'contribution', 'equity', 'investment'];
    return capitalKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('CAP') || lineCode.includes('CONTRIB');
  }

  private isBeginningCash(lineCode: string, description: string): boolean {
    const beginningKeywords = ['beginning', 'start', 'opening'];
    return beginningKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('BEG') || lineCode.includes('OPEN');
  }

  private isEndingCash(lineCode: string, description: string): boolean {
    const endingKeywords = ['ending', 'end', 'closing'];
    return endingKeywords.some(keyword => description.includes(keyword)) ||
      lineCode.includes('END') || lineCode.includes('CLOS');
  }

  private isTotalLine(lineCode: string): boolean {
    const totalKeywords = ['TOTAL', 'NET', 'SUM'];
    return totalKeywords.some(keyword => lineCode.toUpperCase().includes(keyword));
  }

  private sortLinesByDisplayOrder(lines: StatementLine[]): StatementLine[] {
    return lines.sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);
  }

  private initializeCategories(): CashFlowCategories {
    return {
      operating: {
        cashReceipts: 0,
        cashPayments: 0,
        netOperatingCashFlow: 0
      },
      investing: {
        assetPurchases: 0,
        assetSales: 0,
        netInvestingCashFlow: 0
      },
      financing: {
        borrowings: 0,
        repayments: 0,
        capitalContributions: 0,
        netFinancingCashFlow: 0
      },
      summary: {
        netCashFlow: 0,
        beginningCash: 0,
        endingCash: 0
      }
    };
  }
}