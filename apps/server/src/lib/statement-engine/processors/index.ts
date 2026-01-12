/**
 * Statement Processors Index
 * Exports all statement-specific processors for the five financial statement types
 */

export { RevenueExpenditureProcessor } from './revenue-expenditure-processor';
export type { RevenueExpenditureCategories } from './revenue-expenditure-processor';

export { BalanceSheetProcessor } from './balance-sheet-processor';
export type { BalanceSheetCategories } from './balance-sheet-processor';

export { CashFlowProcessor } from './cash-flow-processor';
export type { CashFlowCategories } from './cash-flow-processor';

export { NetAssetsProcessor } from './net-assets-processor';
export type { NetAssetsCategories } from './net-assets-processor';

export { BudgetVsActualProcessor } from './budget-vs-actual-processor';
export type { BudgetVsActualCategories, BudgetVsActualLine } from './budget-vs-actual-processor';

/**
 * Statement processor factory for creating the appropriate processor based on statement code
 */
export class StatementProcessorFactory {
  static createProcessor(statementCode: string) {
    switch (statementCode.toUpperCase()) {
      case 'REV_EXP':
        return new RevenueExpenditureProcessor();
      case 'BAL_SHEET':
        return new BalanceSheetProcessor();
      case 'CASH_FLOW':
        return new CashFlowProcessor();
      case 'NET_ASSETS':
        return new NetAssetsProcessor();
      case 'BUDGET_VS_ACTUAL':
        return new BudgetVsActualProcessor();
      default:
        throw new Error(`Unsupported statement type: ${statementCode}`);
    }
  }
  
  static getSupportedStatementTypes(): string[] {
    return ['REV_EXP', 'BAL_SHEET', 'CASH_FLOW', 'NET_ASSETS', 'BUDGET_VS_ACTUAL'];
  }
}