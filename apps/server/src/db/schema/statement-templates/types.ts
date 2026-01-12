// TypeScript interfaces for enhanced statement templates

export interface ColumnDefinition {
  columnCode: string; // "DESCRIPTION", "NOTE", "CURRENT_FY", "PRIOR_FY"
  columnName: string; // "Description", "Note", "FY 2025/2026 (FRW)"
  dataType: "TEXT" | "CURRENCY" | "PERCENTAGE" | "NUMBER" | "DATE";
  source: "STATIC" | "CURRENT_PERIOD" | "PRIOR_PERIOD" | "COMPUTED";
  format?: FormatOptions;
  displayOrder: number;
  isVisible: boolean;
}

export interface FormatOptions {
  currencySymbol?: string; // "FRW", "$", "€"
  decimalPlaces?: number;
  showZeroAs?: string; // "-", "0", "N/A"
  prefix?: string;
  suffix?: string;
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
}

export interface ValidationRule {
  ruleCode: string; // "BALANCE_CHECK", "CASH_FLOW_BALANCE"
  ruleName: string; // "Assets must equal Liabilities + Equity"
  formula: string; // "TOTAL_ASSETS = TOTAL_LIABILITIES + TOTAL_EQUITY"
  errorMessage: string;
  severity: "ERROR" | "WARNING" | "INFO";
  isActive: boolean;
}

export interface StatementMetadata {
  // Display configuration
  title?: string;
  subtitle?: string;
  footer?: string;
  
  // Column configuration
  showNotes?: boolean;
  showPriorPeriod?: boolean;
  showVariance?: boolean;
  
  // Formatting options
  currencyFormat?: {
    symbol: string;
    decimalPlaces: number;
    thousandsSeparator: string;
  };
  
  // Display options
  showZeroValues?: boolean;
  showEmptyLines?: boolean;
  groupByCategory?: boolean;
  
  // Export options
  exportFormats?: string[]; // ["PDF", "EXCEL", "CSV"]
  defaultExportFormat?: string;
  
  // Validation options
  enableValidation?: boolean;
  strictMode?: boolean;
  
  // Additional metadata
  tags?: string[];
  description?: string;
  version?: string;
  lastModified?: string;
}

export interface LineDefinition {
  lineCode: string;
  lineItem: string;
  displayOrder: number;
  level: number;
  parentLineId?: number;
  
  // Data mapping
  eventMappings: string[]; // Event codes that feed this line
  calculationFormula?: string; // For computed lines
  aggregationMethod: "SUM" | "DIFFERENCE" | "AVERAGE" | "MAX" | "MIN";
  
  // Display properties
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  displayConditions?: Record<string, any>;
  formatRules: Record<string, any>;
  
  // Additional properties
  metadata?: Record<string, any>;
}

// NOTE: This file contains only TypeScript interfaces and types.
// Actual statement configurations should be stored in the database
// or configuration files, not hardcoded here.
//
// For examples of how to use these types, see:
// - src/db/seeds/modules/enhanced-statement-templates.ts (database seeders)
// - src/db/schema/statement-templates/configurations/ (configuration files)
