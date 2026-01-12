export type CashFlowRowData = {
  section: 'Operating Activities' | 'Investing Activities' | 'Financing Activities' | 'Summary';
  category?: string; // e.g., 'Revenues', 'Expenses', 'Adjustments'
  description: string;
  note?: number | null;
  currentPeriodAmount?: number | null;
  previousPeriodAmount?: number | null;
};

// Continuing note numbering from the previous report (last note was 20)
export const cashFlowData: CashFlowRowData[] = [
  // Operating Activities
  {
    section: 'Operating Activities',
    category: 'Revenues',
    description: 'Grants',
    note: 21,
    currentPeriodAmount: 6200000,
    previousPeriodAmount: 5600000,
  },
  {
    section: 'Operating Activities',
    category: 'Revenues',
    description: 'Sales of goods and services',
    note: 22,
    currentPeriodAmount: 400000,
    previousPeriodAmount: 340000,
  },
  {
    section: 'Operating Activities',
    category: 'Expenses',
    description: 'Compensation of employees',
    note: 23,
    currentPeriodAmount: -2500000,
    previousPeriodAmount: -2300000,
  },
  {
    section: 'Operating Activities',
    category: 'Expenses',
    description: 'Goods and services',
    note: 24,
    currentPeriodAmount: -1800000,
    previousPeriodAmount: -1600000,
  },
  {
    section: 'Operating Activities',
    category: 'Adjustments',
    description: 'Changes in receivables',
    note: 25,
    currentPeriodAmount: -50000,
    previousPeriodAmount: 20000,
  },
  {
    section: 'Operating Activities',
    category: 'Adjustments',
    description: 'Changes in payables',
    note: 26,
    currentPeriodAmount: 100000,
    previousPeriodAmount: -50000,
  },
  // Investing Activities
  {
    section: 'Investing Activities',
    description: 'Acquisition of fixed assets',
    note: 27,
    currentPeriodAmount: -1000000,
    previousPeriodAmount: -800000,
  },
  {
    section: 'Investing Activities',
    description: 'Proceeds from sale of capital items',
    note: 28,
    currentPeriodAmount: 50000,
    previousPeriodAmount: 0,
  },
  // Financing Activities
  {
    section: 'Financing Activities',
    description: 'Proceeds from borrowings',
    note: 29,
    currentPeriodAmount: 300000,
    previousPeriodAmount: 1000000,
  },
  {
    section: 'Financing Activities',
    description: 'Repayment of borrowings',
    note: 30,
    currentPeriodAmount: -300000,
    previousPeriodAmount: -0,
  },
  // Summary/Footer rows (data provided but also calculated for verification)
  {
    section: 'Summary',
    description: 'Cash and cash equivalents at beginning of period',
    note: 31,
    currentPeriodAmount: 7200000,
    previousPeriodAmount: 5580000,
  },
]; 