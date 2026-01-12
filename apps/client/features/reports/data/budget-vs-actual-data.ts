export type BudgetVsActualRowData = {
  category: 'RECEIPTS' | 'EXPENDITURES' | 'NON-FINANCIAL ASSETS';
  description: string;
  note?: number;
  originalBudget: number;
  revisedBudget: number;
  actual: number;
};

// Continuing note numbering from the previous report (last note was 31)
export const budgetVsActualData: BudgetVsActualRowData[] = [
  // Receipts
  {
    category: 'RECEIPTS',
    description: 'Grants and transfers',
    note: 32,
    originalBudget: 10000000,
    revisedBudget: 12000000,
    actual: 11500000,
  },
  {
    category: 'RECEIPTS',
    description: 'Other revenue',
    note: 33,
    originalBudget: 500000,
    revisedBudget: 600000,
    actual: 550000,
  },
  // Expenditures
  {
    category: 'EXPENDITURES',
    description: 'Compensation of employees',
    note: 34,
    originalBudget: 4000000,
    revisedBudget: 4500000,
    actual: 4300000,
  },
  {
    category: 'EXPENDITURES',
    description: 'Goods and services',
    note: 35,
    originalBudget: 3000000,
    revisedBudget: 3200000,
    actual: 3100000,
  },
  {
    category: 'EXPENDITURES',
    description: 'Finance cost',
    note: 36,
    originalBudget: 100000,
    revisedBudget: 120000,
    actual: 115000,
  },
  // Non-financial assets
  {
    category: 'NON-FINANCIAL ASSETS',
    description: 'Capital expenditure',
    note: 37,
    originalBudget: 2000000,
    revisedBudget: 2500000,
    actual: 2300000,
  },
  {
    category: 'NON-FINANCIAL ASSETS',
    description: 'Disposal of tangible fixed assets',
    note: 38,
    originalBudget: 0,
    revisedBudget: 50000,
    actual: 45000,
  },
]; 