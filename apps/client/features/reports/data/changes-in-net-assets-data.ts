export type ChangesInNetAssetsRowData = {
  period: string;
  description: string;
  accumulatedSurplus: number;
  adjustments: number;
  total: number;
};

export const changesInNetAssetsData: ChangesInNetAssetsRowData[] = [
  // --- Period 1: Balances as at 01 July 2022 ---
  {
    period: 'Balances as at 01 July 2022',
    description: 'Initial Balance',
    accumulatedSurplus: 15000000,
    adjustments: 0,
    total: 15000000,
  },
  // --- Period 2: Prior Year Adjustments for 2023/2024 ---
  {
    period: 'Prior Year Adjustments (2023/2024)',
    description: 'Cash and cash equivalents',
    accumulatedSurplus: 0,
    adjustments: -150000,
    total: -150000,
  },
  {
    period: 'Prior Year Adjustments (2023/2024)',
    description: 'Receivables and other financial assets',
    accumulatedSurplus: 0,
    adjustments: 50000,
    total: 50000,
  },
  {
    period: 'Prior Year Adjustments (2023/2024)',
    description: 'Payables and other liabilities',
    accumulatedSurplus: 0,
    adjustments: 75000,
    total: 75000,
  },
  {
    period: 'Net surplus/(deficit) for the year 2023/2024',
    description: 'Net surplus for the period',
    accumulatedSurplus: 1500000,
    adjustments: 0,
    total: 1500000,
  },
  // --- Period 3: Prior Year Adjustments for 2024/2025 ---
  {
    period: 'Prior Year Adjustments (2024/2025)',
    description: 'Investments',
    accumulatedSurplus: 0,
    adjustments: 100000,
    total: 100000,
  },
  {
    period: 'Net surplus/(deficit) for the year 2024/2025',
    description: 'Net surplus for the period',
    accumulatedSurplus: 1750000,
    adjustments: 0,
    total: 1750000,
  },
]; 