export type BalanceSheetRowData = {
  section: 'Assets' | 'Liabilities' | 'Net Assets';
  type: string; // e.g., 'Current Assets', 'Non-current Liabilities'
  description: string;
  note?: number | null;
  currentPeriodAmount?: number | null;
  previousPeriodAmount?: number | null;
};

// Continuing note numbering from the previous report (last note was 10)
export const balanceSheetData: BalanceSheetRowData[] = [
  // Assets Section
  {
    section: "Assets",
    type: "Current Assets",
    description: "Cash and cash equivalents", // keep
    note: 11,
    currentPeriodAmount: 8500000,
    previousPeriodAmount: 7200000,
  },
  // {
  //   section: "Assets",
  //   type: "Current Assets",
  //   description: "Receivables from exchange transactions",
  //   note: 12,
  //   currentPeriodAmount: 450000,
  //   previousPeriodAmount: 400000,
  // },
  {
    section: "Assets",
    type: "Current Assets",
    description: "Advance payments", // keep
    note: 20,
    currentPeriodAmount: 150000,
    previousPeriodAmount: 100000,
  },
  // {
  //   section: "Assets",
  //   type: "Non-current Assets",
  //   description: "Direct investments",
  //   note: 14,
  //   currentPeriodAmount: 2000000,
  //   previousPeriodAmount: 1800000,
  // },
  // Liabilities Section
  {
    section: "Liabilities",
    type: "Current Liabilities",
    description: "Payables", // keep
    note: 22,
    currentPeriodAmount: 750000,
    previousPeriodAmount: 650000,
  },
  // {
  //   section: "Liabilities",
  //   type: "Current Liabilities",
  //   description: "Payments received in advance",
  //   note: 16,
  //   currentPeriodAmount: 200000,
  //   previousPeriodAmount: 150000,
  // },
  // {
  //   section: "Liabilities",
  //   type: "Non-current Liabilities",
  //   description: "Direct borrowings",
  //   note: 17,
  //   currentPeriodAmount: 1500000,
  //   previousPeriodAmount: 1200000,
  // },
  // Net Assets Section (values for these are often derived from other statements)
  {
    section: "Net Assets",
    type: "Net Assets Components",
    description: "Accumulated surplus/(deficits)",
    note: 28,
    currentPeriodAmount: 6900000, // Example value
    previousPeriodAmount: 6000000, // Example value
  },
  // {
  //   section: "Net Assets",
  //   type: "Net Assets Components",
  //   description: "Prior year adjustments",
  //   note: 19,
  //   currentPeriodAmount: 0, // Example value
  //   previousPeriodAmount: 50000, // Example value
  // },
  {
    section: "Net Assets",
    type: "Net Assets Components",
    description: "Surplus/deficit of the period", // keep
    note: 0,
    currentPeriodAmount: 1750000, // This would link from the P&L statement
    previousPeriodAmount: 1500000, // This would link from the P&L statement
  },
]; 