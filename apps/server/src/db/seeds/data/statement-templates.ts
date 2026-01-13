export type ColumnType = 'ACCUMULATED' | 'ADJUSTMENT' | 'TOTAL' | 'CALCULATED';

export type TemplateLine = {
  lineItem: string;
  lineCode: string;
  eventCodes: string[];
  displayOrder: number;
  level: number;
  parentLineId?: number;
  isTotalLine?: boolean;
  isSubtotalLine?: boolean;
  calculationFormula?: string;
  aggregationMethod?: string;
  formatRules?: Record<string, any>;
  metadata?: {
    columnType?: ColumnType;
    note?: number;
    [key: string]: any;
  };
};

export const revenueExpenditureTemplates: TemplateLine[] = [
  // revenues
  {
    lineItem: '1. REVENUES',
    lineCode: 'REVENUES_HEADER',
    eventCodes: [],
    displayOrder: 1,
    level: 1,
    isSubtotalLine: false,
    formatRules: { bold: true }
  },
  {
    lineItem: '1.1 Revenue from non-exchange',
    lineCode: 'REVENUE_NON_EXCHANGE_HEADER',
    eventCodes: [],
    displayOrder: 2,
    level: 2,
    isSubtotalLine: false,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Tax revenue',
    lineCode: 'TAX_REVENUE',
    eventCodes: ['TAX_REVENUE'],
    displayOrder: 3,
    level: 3,
    metadata: { note: 1 }
  },
  {
    lineItem: 'Grants',
    lineCode: 'GRANTS',
    eventCodes: ['GRANTS'],
    displayOrder: 4,
    level: 3,
    metadata: { note: 2 }
  },
  {
    lineItem: 'Transfers from central treasury',
    lineCode: 'TRANSFERS_CENTRAL',
    eventCodes: ['TRANSFERS_CENTRAL_TREASURY'],
    displayOrder: 5,
    level: 3,
    metadata: { note: 3 }
  },
  {
    lineItem: 'Transfers from public entities',
    lineCode: 'TRANSFERS_PUBLIC',
    eventCodes: ['TRANSFERS_PUBLIC_ENTITIES'],
    displayOrder: 6,
    level: 3,
    metadata: { note: 4 }
  },
  {
    lineItem: 'Fines, penalties and licences',
    lineCode: 'FINES_PENALTIES',
    eventCodes: ['FINES_PENALTIES_LICENSES'],
    displayOrder: 7,
    level: 3,
    metadata: { note: 5 }
  },

  {
    lineItem: '1.2 Revenue from exchange transactions',
    lineCode: 'REVENUE_EXCHANGE_HEADER',
    eventCodes: [],
    displayOrder: 8,
    level: 2,
    isSubtotalLine: false,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Property income',
    lineCode: 'PROPERTY_INCOME',
    eventCodes: ['PROPERTY_INCOME'],
    displayOrder: 9,
    level: 3,
    metadata: { note: 6 }
  },
  {
    lineItem: 'Sales of goods and services',
    lineCode: 'SALES_GOODS_SERVICES',
    eventCodes: ['SALES_GOODS_SERVICES'],
    displayOrder: 10,
    level: 3,
    metadata: { note: 7 }
  },
  {
    lineItem: 'Proceeds from sale of capital items',
    lineCode: 'SALE_CAPITAL_ITEMS',
    eventCodes: ['PROCEEDS_SALE_CAPITAL'],
    displayOrder: 11,
    level: 3,
    metadata: { note: 8 }
  },
  {
    lineItem: 'Other revenue',
    lineCode: 'OTHER_REVENUE',
    eventCodes: ['OTHER_REVENUE'],
    displayOrder: 12,
    level: 3,
    metadata: { note: 9 }
  },

  {
    lineItem: '1.3 Borrowings',
    lineCode: 'BORROWINGS_HEADER',
    eventCodes: [],
    displayOrder: 13,
    level: 2,
    isSubtotalLine: false,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Domestic borrowings',
    lineCode: 'DOMESTIC_BORROWINGS',
    eventCodes: ['DOMESTIC_BORROWINGS'],
    displayOrder: 14,
    level: 3,
    metadata: { note: 10 }
  },
  {
    lineItem: 'External borrowings',
    lineCode: 'EXTERNAL_BORROWINGS',
    eventCodes: ['EXTERNAL_BORROWINGS'],
    displayOrder: 15,
    level: 3,
    metadata: { note: 11 }
  },
  {
    lineItem: 'TOTAL REVENUE',
    lineCode: 'TOTAL_REVENUE',
    eventCodes: [],
    displayOrder: 16,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(TAX_REVENUE, GRANTS, TRANSFERS_CENTRAL_TREASURY, TRANSFERS_PUBLIC_ENTITIES, FINES_PENALTIES_LICENSES, PROPERTY_INCOME, SALES_GOODS_SERVICES, PROCEEDS_SALE_CAPITAL, OTHER_REVENUE, DOMESTIC_BORROWINGS, EXTERNAL_BORROWINGS)',
    formatRules: { bold: true }
  },

  // expenses
  {
    lineItem: '2. EXPENSES',
    lineCode: 'EXPENSES_HEADER',
    eventCodes: [],
    displayOrder: 17,
    level: 1,
    isSubtotalLine: false,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Compensation of employees',
    lineCode: 'COMPENSATION_EMPLOYEES',
    eventCodes: ['COMPENSATION_EMPLOYEES'],
    displayOrder: 18,
    level: 2,
    metadata: { note: 12 }
  },
  {
    lineItem: 'Goods and services',
    lineCode: 'GOODS_SERVICES',
    eventCodes: ['GOODS_SERVICES'],
    displayOrder: 19,
    level: 2,
    metadata: { note: 13 }
  },
  {
    lineItem: 'Grants and other transfers',
    lineCode: 'GRANTS_TRANSFERS',
    eventCodes: ['GRANTS_TRANSFERS'],
    displayOrder: 20,
    level: 2,
    metadata: { note: 14 }
  },
  {
    lineItem: 'Subsidies',
    lineCode: 'SUBSIDIES',
    eventCodes: ['SUBSIDIES'],
    displayOrder: 21,
    level: 2,
    metadata: { note: 15 }
  },
  {
    lineItem: 'Social assistance',
    lineCode: 'SOCIAL_ASSISTANCE',
    eventCodes: ['SOCIAL_ASSISTANCE'],
    displayOrder: 22,
    level: 2,
    metadata: { note: 16 }
  },
  {
    lineItem: 'Finance costs',
    lineCode: 'FINANCE_COSTS',
    eventCodes: ['FINANCE_COSTS'],
    displayOrder: 23,
    level: 2,
    metadata: { note: 17 }
  },
  {
    lineItem: 'Acquisition of fixed assets',
    lineCode: 'ACQUISITION_FIXED_ASSETS',
    eventCodes: ['ACQUISITION_FIXED_ASSETS'],
    displayOrder: 24,
    level: 2,
    metadata: { note: 18 }
  },
  {
    lineItem: 'Repayment of borrowings',
    lineCode: 'REPAYMENT_BORROWINGS',
    eventCodes: ['REPAYMENT_BORROWINGS'],
    displayOrder: 25,
    level: 2,
    metadata: { note: 19 }
  },
  {
    lineItem: 'Other expenses',
    lineCode: 'OTHER_EXPENSES',
    eventCodes: ['OTHER_EXPENSES'],
    displayOrder: 26,
    level: 2,
    metadata: { note: 20 }
  },
  {
    lineItem: 'TOTAL EXPENSES',
    lineCode: 'TOTAL_EXPENSES',
    eventCodes: [],
    displayOrder: 27,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(COMPENSATION_EMPLOYEES, GOODS_SERVICES, GRANTS_TRANSFERS, SUBSIDIES, SOCIAL_ASSISTANCE, FINANCE_COSTS, ACQUISITION_FIXED_ASSETS, REPAYMENT_BORROWINGS, OTHER_EXPENSES)',
    formatRules: { bold: true }
  },

  // surplus/deficit
  {
    lineItem: '3. SURPLUS / (DEFICIT) FOR THE PERIOD',
    lineCode: 'SURPLUS_DEFICIT',
    eventCodes: [],
    displayOrder: 28,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'TOTAL_REVENUE - TOTAL_EXPENSES',
    aggregationMethod: 'DIFF',
    formatRules: { bold: true }
  },
];

export const assetsAndLiabilitiesTemplates: TemplateLine[] = [
  // assets
  {
    lineItem: '1. ASSETS',
    lineCode: 'ASSETS_HEADER',
    eventCodes: [],
    displayOrder: 1,
    level: 1,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: '1.1 Current assets',
    lineCode: 'CURRENT_ASSETS_HEADER',
    eventCodes: [],
    displayOrder: 2,
    level: 2,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Cash and cash equivalents',
    lineCode: 'CASH_EQUIVALENTS',
    eventCodes: ['CASH_EQUIVALENTS_END'], // Only END - BEGIN is for carryforward only
    displayOrder: 3,
    level: 3
  },
  {
    lineItem: 'Receivables from exchange transactions',
    lineCode: 'RECEIVABLES_EXCHANGE',
    eventCodes: ['RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE'],
    displayOrder: 4,
    level: 3
  },
  {
    lineItem: 'Advance payments',
    lineCode: 'ADVANCE_PAYMENTS',
    eventCodes: ['ADVANCE_PAYMENTS'],
    displayOrder: 5,
    level: 3
  },
  {
    lineItem: 'Total current assets',
    lineCode: 'TOTAL_CURRENT_ASSETS',
    eventCodes: [],
    displayOrder: 6,
    level: 2,
    isTotalLine: true,
    formatRules: { bold: true }
  },

  {
    lineItem: '1.2 Non-current assets',
    lineCode: 'NON_CURRENT_ASSETS_HEADER',
    eventCodes: [],
    displayOrder: 7,
    level: 2,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Direct investments',
    lineCode: 'DIRECT_INVESTMENTS',
    eventCodes: ['DIRECT_INVESTMENTS'],
    displayOrder: 8,
    level: 3
  },
  {
    lineItem: 'Total non-current assets',
    lineCode: 'TOTAL_NON_CURRENT_ASSETS',
    eventCodes: [],
    displayOrder: 9,
    level: 2,
    isTotalLine: true,
    formatRules: { bold: true }
  },

  {
    lineItem: 'Total assets (A)',
    lineCode: 'TOTAL_ASSETS',
    eventCodes: [],
    displayOrder: 10,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(TOTAL_CURRENT_ASSETS, TOTAL_NON_CURRENT_ASSETS)',
    formatRules: { bold: true }
  },

  // liabilities
  {
    lineItem: '2. LIABILITIES',
    lineCode: 'LIABILITIES_HEADER',
    eventCodes: [],
    displayOrder: 11,
    level: 1,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: '2.1 Current liabilities',
    lineCode: 'CURRENT_LIABILITIES_HEADER',
    eventCodes: [],
    displayOrder: 12,
    level: 2,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Payables',
    lineCode: 'PAYABLES',
    eventCodes: ['PAYABLES'],
    displayOrder: 13,
    level: 3
  },
  {
    lineItem: 'Payments received in advance',
    lineCode: 'PAYMENTS_RECEIVED_ADVANCE',
    eventCodes: ['PAYMENTS_RECEIVED_ADVANCE'],
    displayOrder: 14,
    level: 3
  },
  {
    lineItem: 'Retained performance securities',
    lineCode: 'RETAINED_PERFORMANCE_SECURITIES',
    eventCodes: ['RETAINED_PERFORMANCE_SECURITIES'],
    displayOrder: 15,
    level: 3
  },
  {
    lineItem: 'Total current liabilities',
    lineCode: 'TOTAL_CURRENT_LIABILITIES',
    eventCodes: [],
    displayOrder: 16,
    level: 2,
    isTotalLine: true,
    formatRules: { bold: true }
  },

  {
    lineItem: '2.2 Non-current liabilities',
    lineCode: 'NON_CURRENT_LIABILITIES_HEADER',
    eventCodes: [],
    displayOrder: 17,
    level: 2,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Direct borrowings',
    lineCode: 'DIRECT_BORROWINGS',
    eventCodes: ['DIRECT_BORROWINGS'],
    displayOrder: 18,
    level: 3
  },
  {
    lineItem: 'Total non-current liabilities',
    lineCode: 'TOTAL_NON_CURRENT_LIABILITIES',
    eventCodes: [],
    displayOrder: 19,
    level: 2,
    isTotalLine: true,
    formatRules: { bold: true }
  },

  {
    lineItem: 'Total liabilities (B)',
    lineCode: 'TOTAL_LIABILITIES',
    eventCodes: [],
    displayOrder: 20,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(TOTAL_CURRENT_LIABILITIES, TOTAL_NON_CURRENT_LIABILITIES)',
    formatRules: { bold: true }
  },

  // net assets
  {
    lineItem: 'Net assets C = A - B',
    lineCode: 'NET_ASSETS',
    eventCodes: [],
    displayOrder: 21,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'TOTAL_ASSETS - TOTAL_LIABILITIES',
    aggregationMethod: 'DIFF',
    formatRules: { bold: true }
  },

  // equity
  {
    lineItem: '3. REPRESENTED BY',
    lineCode: 'REPRESENTED_BY_HEADER',
    eventCodes: [],
    displayOrder: 22,
    level: 1,
    isSubtotalLine: true,
    formatRules: { bold: true }
  },
  {
    lineItem: 'Accumulated surplus/(deficits)',
    lineCode: 'ACCUMULATED_SURPLUS_DEFICITS',
    eventCodes: ['ACCUMULATED_SURPLUS_DEFICITS'],
    displayOrder: 23,
    level: 2
  },
  {
    lineItem: 'Prior year adjustments',
    lineCode: 'PRIOR_YEAR_ADJUSTMENTS',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS'],
    displayOrder: 24,
    level: 2
  },
  {
    lineItem: 'Surplus / deficits of the period',
    lineCode: 'SURPLUS_DEFICITS_PERIOD',
    eventCodes: [],
    displayOrder: 25,
    level: 2,
    isTotalLine: true,
    calculationFormula: 'CROSS_STATEMENT_SURPLUS_DEFICIT',
    aggregationMethod: 'DIFF'
  },
  {
    lineItem: 'Total Net Assets',
    lineCode: 'TOTAL_NET_ASSETS',
    eventCodes: [],
    displayOrder: 26,
    level: 1,
    isTotalLine: true,
    formatRules: { bold: true }
  },
];

export const cashFlowTemplates: TemplateLine[] = [
  // operating activities
  { lineItem: 'CASH FLOW FROM OPERATING ACTIVITIES', lineCode: 'CASH_FLOW_OPERATING_HEADER', eventCodes: [], displayOrder: 1, level: 1, isSubtotalLine: true },

  // revenue
  { lineItem: '1. REVENUE', lineCode: 'REVENUE_HEADER', eventCodes: [], displayOrder: 2, level: 2, isSubtotalLine: false },
  { lineItem: '1.1 Revenue from non-exchange transactions', lineCode: 'REVENUE_NON_EXCHANGE_HEADER', eventCodes: [], displayOrder: 3, level: 3, isSubtotalLine: false },
  { lineItem: 'Tax revenue', lineCode: 'TAX_REVENUE', eventCodes: ['TAX_REVENUE'], displayOrder: 4, level: 4 },
  { lineItem: 'Grants', lineCode: 'GRANTS', eventCodes: ['GRANTS'], displayOrder: 5, level: 4 },
  { lineItem: 'Transfers from central treasury', lineCode: 'TRANSFERS_CENTRAL', eventCodes: ['TRANSFERS_CENTRAL_TREASURY'], displayOrder: 6, level: 4 },
  { lineItem: 'Transfers from public entities', lineCode: 'TRANSFERS_PUBLIC', eventCodes: ['TRANSFERS_PUBLIC_ENTITIES'], displayOrder: 7, level: 4 },
  { lineItem: 'Fines, penalties, and licenses', lineCode: 'FINES_PENALTIES', eventCodes: ['FINES_PENALTIES_LICENSES'], displayOrder: 8, level: 4 },

  { lineItem: '1.2 Revenue from exchange transactions', lineCode: 'REVENUE_EXCHANGE_HEADER', eventCodes: [], displayOrder: 9, level: 3, isSubtotalLine: false },
  { lineItem: 'Property income', lineCode: 'PROPERTY_INCOME', eventCodes: ['PROPERTY_INCOME'], displayOrder: 10, level: 4 },
  { lineItem: 'Sales of goods and services', lineCode: 'SALES_GOODS_SERVICES', eventCodes: ['SALES_GOODS_SERVICES'], displayOrder: 11, level: 4 },
  { lineItem: 'Other revenue', lineCode: 'OTHER_REVENUE', eventCodes: ['OTHER_REVENUE'], displayOrder: 13, level: 4 },

  // expenses
  { lineItem: '2. EXPENSES', lineCode: 'EXPENSES_HEADER', eventCodes: [], displayOrder: 14, level: 2, isSubtotalLine: false },
  { lineItem: 'Compensation of employees', lineCode: 'COMPENSATION_EMPLOYEES', eventCodes: ['COMPENSATION_EMPLOYEES'], displayOrder: 15, level: 3 },
  { lineItem: 'Goods and services', lineCode: 'GOODS_SERVICES', eventCodes: ['GOODS_SERVICES'], displayOrder: 16, level: 3 },
  { lineItem: 'Grants and transfers', lineCode: 'GRANTS_TRANSFERS', eventCodes: ['GRANTS_TRANSFERS'], displayOrder: 17, level: 3 },
  { lineItem: 'Subsidies', lineCode: 'SUBSIDIES', eventCodes: ['SUBSIDIES'], displayOrder: 18, level: 3 },
  { lineItem: 'Social assistance', lineCode: 'SOCIAL_ASSISTANCE', eventCodes: ['SOCIAL_ASSISTANCE'], displayOrder: 19, level: 3 },
  { lineItem: 'Finance costs', lineCode: 'FINANCE_COSTS', eventCodes: ['FINANCE_COSTS'], displayOrder: 20, level: 3 },
  { lineItem: 'Other expenses', lineCode: 'OTHER_EXPENSES', eventCodes: ['OTHER_EXPENSES'], displayOrder: 21, level: 3 },

  // adjustments
  { lineItem: 'Adjusted for:', lineCode: 'ADJUSTED_FOR_HEADER', eventCodes: [], displayOrder: 22, level: 2, isSubtotalLine: false },
  { lineItem: 'Changes in receivables', lineCode: 'CHANGES_RECEIVABLES', eventCodes: ['ADVANCE_PAYMENTS'], displayOrder: 23, level: 3, calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)', metadata: { isComputed: true } },
  { lineItem: 'Changes in payables', lineCode: 'CHANGES_PAYABLES', eventCodes: ['PAYABLES'], displayOrder: 24, level: 3, calculationFormula: 'WORKING_CAPITAL_CHANGE(PAYABLES)', metadata: { isComputed: true } },
  { lineItem: 'Prior year adjustments', lineCode: 'PRIOR_YEAR_ADJUSTMENTS', eventCodes: ['PRIOR_YEAR_ADJUSTMENTS'], displayOrder: 25, level: 3 },
  { lineItem: 'Net cash flows from operating activities', lineCode: 'NET_CASH_FLOW_OPERATING', eventCodes: [], displayOrder: 26, level: 1, isTotalLine: true },

  // investing activities
  { lineItem: 'CASH FLOW FROM INVESTING ACTIVITIES', lineCode: 'CASH_FLOW_INVESTING_HEADER', eventCodes: [], displayOrder: 27, level: 1, isSubtotalLine: false },
  { lineItem: 'Acquisition of fixed assets', lineCode: 'ACQUISITION_FIXED_ASSETS', eventCodes: ['ACQUISITION_FIXED_ASSETS'], displayOrder: 28, level: 2 },
  { lineItem: 'Proceeds from sale of capital items', lineCode: 'PROCEEDS_SALE_CAPITAL', eventCodes: ['PROCEEDS_SALE_CAPITAL'], displayOrder: 29, level: 2 },
  { lineItem: 'Purchase shares', lineCode: 'PURCHASE_SHARES', eventCodes: [], displayOrder: 30, level: 2 },
  { lineItem: 'Net cash flows from investing activities', lineCode: 'NET_CASH_FLOW_INVESTING', eventCodes: [], displayOrder: 31, level: 1, isTotalLine: true },

  // financing activities
  { lineItem: 'CASH FLOW FROM FINANCING ACTIVITIES', lineCode: 'CASH_FLOW_FINANCING_HEADER', eventCodes: [], displayOrder: 32, level: 1, isSubtotalLine: false },
  { lineItem: 'Proceeds from borrowings', lineCode: 'PROCEEDS_BORROWINGS', eventCodes: ['DOMESTIC_BORROWINGS', 'EXTERNAL_BORROWINGS'], displayOrder: 33, level: 2 },
  { lineItem: 'Repayment of borrowings', lineCode: 'REPAYMENT_BORROWINGS', eventCodes: ['REPAYMENT_BORROWINGS'], displayOrder: 34, level: 2 },
  { lineItem: 'Net cash flows from financing activities', lineCode: 'NET_CASH_FLOW_FINANCING', eventCodes: [], displayOrder: 35, level: 1, isTotalLine: true },

  // net change and reconciliation
  { lineItem: 'Net increase/decrease in cash and cash equivalents', lineCode: 'NET_INCREASE_CASH', eventCodes: [], displayOrder: 36, level: 1, isTotalLine: true },
  // NOTE: CASH_EQUIVALENTS_BEGIN is populated by carryforward service, not by event mappings
  { lineItem: 'Cash and cash equivalents at beginning of period', lineCode: 'CASH_BEGINNING', eventCodes: ['CASH_EQUIVALENTS_BEGIN'], displayOrder: 37, level: 2 },
  {
    lineItem: 'Cash and cash equivalents at end of period',
    lineCode: 'CASH_ENDING',
    eventCodes: ['CASH_EQUIVALENTS_END'],
    displayOrder: 38,
    level: 2
  },
];

export const changeInNetAssetsTemplate: TemplateLine[] = [
  // Opening balances
  {
    lineItem: 'Balances as at 30th June {{PREV_YEAR}}',
    lineCode: 'BALANCES_JUNE_PREV',
    eventCodes: [],
    displayOrder: 1,
    level: 1,
    isSubtotalLine: true,
    calculationFormula: 'TOTAL_NET_ASSETS',
    metadata: { columnType: 'ACCUMULATED' }
  },

  // Prior year adjustments (previous fiscal year)
  {
    lineItem: 'Prior year adjustments:',
    lineCode: 'PRIOR_YEAR_ADJUSTMENTS_PREV_CURRENT',
    eventCodes: [],
    displayOrder: 2,
    level: 1,
    isSubtotalLine: true,
    metadata: { columnType: 'ACCUMULATED' }
  },
  {
    lineItem: 'Cash and cash equivalent',
    lineCode: 'CASH_EQUIVALENT_PREV_CURRENT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_CASH'],
    displayOrder: 3,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Receivables and other financial assets',
    lineCode: 'RECEIVABLES_PREV_CURRENT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES'],
    displayOrder: 4,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Investments',
    lineCode: 'INVESTMENTS_PREV_CURRENT',
    eventCodes: ['DIRECT_INVESTMENTS'],
    displayOrder: 5,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Payables and other liabilities',
    lineCode: 'PAYABLES_PREV_CURRENT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_PAYABLES'],
    displayOrder: 6,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Borrowing',
    lineCode: 'BORROWING_PREV_CURRENT',
    eventCodes: ['DIRECT_BORROWINGS'],
    displayOrder: 7,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Net surplus/(Deficit) for the financial year',
    lineCode: 'NET_SURPLUS_PREV_CURRENT',
    eventCodes: [],
    displayOrder: 8,
    level: 2,
    // calculationFormula: '(TAX_REVENUE + GRANTS + TRANSFERS_CENTRAL_TREASURY + TRANSFERS_PUBLIC_ENTITIES + FINES_PENALTIES_LICENSES + PROPERTY_INCOME + SALES_GOODS_SERVICES + PROCEEDS_SALE_CAPITAL + OTHER_REVENUE + DOMESTIC_BORROWINGS + EXTERNAL_BORROWINGS) - (COMPENSATION_EMPLOYEES + GOODS_SERVICES + GRANTS_TRANSFERS + SUBSIDIES + SOCIAL_ASSISTANCE + FINANCE_COSTS + ACQUISITION_FIXED_ASSETS + REPAYMENT_BORROWINGS + OTHER_EXPENSES)',
    calculationFormula: '(TRANSFERS_PUBLIC_ENTITIES + OTHER_REVENUE) - (GOODS_SERVICES + OTHER_EXPENSES)',
    aggregationMethod: 'DIFF',
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Balance as at 30th June {{CURRENT_YEAR}}',
    lineCode: 'BALANCE_JUNE_CURRENT',
    eventCodes: [],
    displayOrder: 9,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(BALANCES_JUNE_PREV, CASH_EQUIVALENT_PREV_CURRENT, RECEIVABLES_PREV_CURRENT, INVESTMENTS_PREV_CURRENT, PAYABLES_PREV_CURRENT, BORROWING_PREV_CURRENT, NET_SURPLUS_PREV_CURRENT)',
    metadata: { columnType: 'TOTAL' }
  },

  // Beginning of new period
  {
    lineItem: 'Balance as at 01st July {{CURRENT_YEAR}}',
    lineCode: 'BALANCE_JULY_CURRENT',
    eventCodes: [],
    displayOrder: 10,
    level: 1,
    isSubtotalLine: true,
    calculationFormula: 'BALANCE_JUNE_CURRENT',
    metadata: { columnType: 'ACCUMULATED' }
  },

  // Current period adjustments (current fiscal year)
  {
    lineItem: 'Prior year adjustments:',
    lineCode: 'PRIOR_YEAR_ADJUSTMENTS_CURRENT_NEXT',
    eventCodes: [],
    displayOrder: 11,
    level: 1,
    isSubtotalLine: true,
    metadata: { columnType: 'ACCUMULATED' }
  },
  {
    lineItem: 'Cash and cash equivalent',
    lineCode: 'CASH_EQUIVALENT_CURRENT_NEXT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_CASH'],
    displayOrder: 12,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Receivables and other financial assets',
    lineCode: 'RECEIVABLES_CURRENT_NEXT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES'],
    displayOrder: 13,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Investments',
    lineCode: 'INVESTMENTS_CURRENT_NEXT',
    eventCodes: ['DIRECT_INVESTMENTS'],
    displayOrder: 14,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Payables and other liabilities',
    lineCode: 'PAYABLES_CURRENT_NEXT',
    eventCodes: ['PRIOR_YEAR_ADJUSTMENTS_PAYABLES'],
    displayOrder: 15,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Borrowing',
    lineCode: 'PRIOR_YEAR_ADJUSTMENT_BORROWING_CURRENT_NEXT',
    eventCodes: ['DIRECT_BORROWINGS'],
    displayOrder: 16,
    level: 2,
    metadata: { columnType: 'ADJUSTMENT' }
  },
  {
    lineItem: 'Net surplus/(Deficit) for the financial year',
    lineCode: 'NET_SURPLUS_CURRENT_NEXT',
    eventCodes: [],
    displayOrder: 17,
    level: 2,
    calculationFormula: '(TRANSFERS_PUBLIC_ENTITIES + OTHER_REVENUE) - (GOODS_SERVICES + GRANTS_TRANSFERS)',
    aggregationMethod: 'DIFF',
    metadata: { columnType: 'ADJUSTMENT' }
  },

  // Closing balances
  {
    lineItem: 'Balance as at {{PERIOD_END_DATE}}',
    lineCode: 'BALANCE_PERIOD_END',
    eventCodes: [],
    displayOrder: 18,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(BALANCE_JULY_CURRENT, CASH_EQUIVALENT_CURRENT_NEXT, RECEIVABLES_CURRENT_NEXT, INVESTMENTS_CURRENT_NEXT, PAYABLES_CURRENT_NEXT, BORROWING_CURRENT_NEXT, NET_SURPLUS_CURRENT_NEXT)',
    metadata: { columnType: 'TOTAL' }
  },
];

export const budgetVsActualAmountsTemplate: TemplateLine[] = [
  // 1. RECEIPTS Section
  {
    lineItem: '1. RECEIPTS',
    lineCode: 'RECEIPTS_HEADER',
    eventCodes: [],
    displayOrder: 1,
    level: 1,
    isSubtotalLine: true,
    formatRules: { bold: true },
    metadata: { statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Tax revenue',
    lineCode: 'TAX_REVENUE',
    eventCodes: ['TAX_REVENUE'],
    displayOrder: 2,
    level: 2,
    metadata: { note: 1, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Grants and transfers',
    lineCode: 'GRANTS_TRANSFERS',
    eventCodes: ['GRANTS'],
    displayOrder: 3,
    level: 2,
    metadata: { note: 2, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Other revenue',
    lineCode: 'OTHER_REVENUE',
    eventCodes: ['OTHER_REVENUE'],
    displayOrder: 4,
    level: 2,
    metadata: { note: 9, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Transfers from public entities',
    lineCode: 'TRANSFERS_PUBLIC',
    eventCodes: [], // Empty - uses custom mapping
    displayOrder: 5,
    level: 2,
    metadata: {
      note: 4,
      statementType: 'BUDGET_VS_ACTUAL',
      budgetVsActualMapping: {
        budgetEvents: ['GOODS_SERVICES_PLANNING'],
        actualEvents: ['TRANSFERS_PUBLIC_ENTITIES']
      }
    }
  },
  {
    lineItem: 'Total Receipts',
    lineCode: 'TOTAL_RECEIPTS',
    eventCodes: [],
    displayOrder: 6,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(TAX_REVENUE, GRANTS_TRANSFERS, OTHER_REVENUE, TRANSFERS_PUBLIC)',
    formatRules: { bold: true },
    metadata: { note: 33, statementType: 'BUDGET_VS_ACTUAL' }
  },

  // 2. EXPENDITURES Section
  {
    lineItem: '2. EXPENDITURES',
    lineCode: 'EXPENDITURES_HEADER',
    eventCodes: [],
    displayOrder: 7,
    level: 1,
    isSubtotalLine: true,
    formatRules: { bold: true },
    metadata: { statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Compensation of employees',
    lineCode: 'COMPENSATION_EMPLOYEES',
    eventCodes: ['COMPENSATION_EMPLOYEES'],
    displayOrder: 8,
    level: 2,
    metadata: { note: 12, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Goods and services',
    lineCode: 'GOODS_SERVICES',
    eventCodes: ['GOODS_SERVICES', 'GRANTS_TRANSFERS'],
    displayOrder: 9,
    level: 2,
    metadata: {
      note: 23,
      statementType: 'BUDGET_VS_ACTUAL',
      budgetVsActualMapping: {
        budgetEvents: ['GOODS_SERVICES_PLANNING'],
        actualEvents: ['GOODS_SERVICES', 'GRANTS_TRANSFERS']
      }
    }
  },
  {
    lineItem: 'Finance cost',
    lineCode: 'FINANCE_COSTS',
    eventCodes: ['FINANCE_COSTS'],
    displayOrder: 10,
    level: 2,
    metadata: { note: 17, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Subsidies',
    lineCode: 'SUBSIDIES',
    eventCodes: ['SUBSIDIES'],
    displayOrder: 11,
    level: 2,
    metadata: { note: 15, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Grants and other transfers',
    lineCode: 'GRANTS_OTHER_TRANSFERS',
    eventCodes: ['GRANTS_TRANSFERS'],
    displayOrder: 12,
    level: 2,
    metadata: { note: 14, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Social assistance',
    lineCode: 'SOCIAL_ASSISTANCE',
    eventCodes: ['SOCIAL_ASSISTANCE'],
    displayOrder: 13,
    level: 2,
    metadata: { note: 16, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Other expenses',
    lineCode: 'OTHER_EXPENSES',
    eventCodes: ['OTHER_EXPENSES'],
    displayOrder: 14,
    level: 2,
    metadata: { note: 20, statementType: 'BUDGET_VS_ACTUAL' }
  },
  {
    lineItem: 'Total Expenditures',
    lineCode: 'TOTAL_EXPENDITURES',
    eventCodes: [],
    displayOrder: 15,
    level: 1,
    isTotalLine: true,
    calculationFormula: 'SUM(COMPENSATION_EMPLOYEES, GOODS_SERVICES, FINANCE_COSTS, SUBSIDIES, GRANTS_OTHER_TRANSFERS, SOCIAL_ASSISTANCE, OTHER_EXPENSES)',
    formatRules: { bold: true },
    metadata: { note: 34, statementType: 'BUDGET_VS_ACTUAL' }
  },

  // Note: Total non-financial assets, Net lending/borrowing, and Total net incurrence of liabilities
  // have been removed per accounting department request
];


