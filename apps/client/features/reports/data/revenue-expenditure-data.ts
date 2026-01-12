export type ReportRowData = {
  description: string;
  note?: number | null;
  currentPeriodAmount?: number | null;
  previousPeriodAmount?: number | null;
  isCategory?: boolean;
  isTotal?: boolean;
  isSubtotal?: boolean;
  children?: ReportRowData[];
};

export const revenueExpenditureData: ReportRowData[] = [
  {
    description: "1. REVENUES",
    isCategory: true,
    children: [
      {
        description: "1.1 Revenue from Non-exchange",
        children: [
          { description: "Transfers from public entities", note: 4, currentPeriodAmount: 1200000, previousPeriodAmount: 1100000 }, // keep
        ]
      },
      {
        description: "1.2 Revenue from Exchange transactions",
        children: [
          // { description: "Sales of goods and services", note: 3, currentPeriodAmount: 350000, previousPeriodAmount: 300000 },
          // { description: "other revenue", note: 4, currentPeriodAmount: 50000, previousPeriodAmount: 40000 },
        ] 
      },
      {
        description: "1.3 Borrowings",
        children: [
            // { description: "Domestic borrowings", note: 5, currentPeriodAmount: 0, previousPeriodAmount: 200000 },
        ]
      }
    ]
  },
  {
    description: "2. EXPENSES",
    isCategory: true,
    children: [
      // { description: "Compensation of employees", note: 6, currentPeriodAmount: 2500000, previousPeriodAmount: 2300000 },
      { description: "Goods and services", note: 3, currentPeriodAmount: 1800000, previousPeriodAmount: 1600000 }, // keep
      { description: "Grants and other transfers", note: 13, currentPeriodAmount: 500000, previousPeriodAmount: 450000 }, //keep
      // { description: "Finance costs", note: 9, currentPeriodAmount: 20000, previousPeriodAmount: 15000 },
      // { description: "Other expenses", note: 14, currentPeriodAmount: 80000, previousPeriodAmount: 70000 },
    ]
  }
]; 