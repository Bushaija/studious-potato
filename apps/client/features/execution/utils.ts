export interface QuarterLabel {
  line1: string;
  line2: string;
}

// Helper function to generate quarter labels based on the fiscal year
// export const generateQuarterLabels = (baseYear: number): QuarterLabel[] => {
//   return [
//     { line1: "Q1", line2: `(Jan-Mar ${baseYear})` },
//     { line1: "Q2", line2: `(Apr-Jun ${baseYear})` },
//     { line1: "Q3", line2: `(Jul-Sep ${baseYear + 1})` },
//     { line1: "Q4", line2: `(Oct-Dec ${baseYear + 1})` },
//   ]
// } 

export const getCurrentFiscalYear = (): number => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec
  const currentYear = now.getFullYear();
  
  // Fiscal year starts in July and is named by the ending year
  // e.g., July 2025 = FY 2026 (2025-07-01 to 2026-06-30)
  return currentMonth >= 6 ? currentYear + 1 : currentYear;
};

export const generateQuarterLabels = (baseFiscalYear?: number): QuarterLabel[] => {
  const fiscalYear = baseFiscalYear ?? getCurrentFiscalYear();

  return [
    { line1: "Q1", line2: `(Jul-Sep ${fiscalYear})` },
    { line1: "Q2", line2: `(Oct-Dec ${fiscalYear})` },
    { line1: "Q3", line2: `(Jan-Mar ${fiscalYear + 1})` },
    { line1: "Q4", line2: `(Apr-Jun ${fiscalYear + 1})` },
  ];
};