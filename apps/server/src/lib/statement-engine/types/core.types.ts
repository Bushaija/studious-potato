/**
 * Core TypeScript interfaces for Financial Statement Generation
 * Based on design document specifications
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum StatementCode {
  REV_EXP = 'REV_EXP',
  BAL_SHEET = 'BAL_SHEET', 
  CASH_FLOW = 'CASH_FLOW',
  NET_ASSETS = 'NET_ASSETS',
  BUDGET_VS_ACTUAL = 'BUDGET_VS_ACTUAL'
}

export enum EventType {
  PLANNING = 'planning',
  EXECUTION = 'execution'
}

export enum FormulaOperation {
  SUM = 'SUM',
  DIFF = 'DIFF',
  COMPUTED_BALANCE = 'COMPUTED_BALANCE'
}

export enum ColumnType {
  ACCUMULATED = 'ACCUMULATED',
  ADJUSTMENT = 'ADJUSTMENT',
  TOTAL = 'TOTAL',
  CALCULATED = 'CALCULATED'
}

// ============================================================================
// TEMPLATE INTERFACES
// ============================================================================

export interface StatementTemplate {
  id: number;
  statementCode: string;
  statementName: string;
  lines: TemplateLine[];
  metadata: TemplateMetadata;
}

export interface TemplateLine {
  id: number;
  lineCode: string;
  description: string;
  displayOrder: number;
  eventMappings: string[];
  calculationFormula?: string;
  formatting: LineFormatting;
  displayConditions?: DisplayCondition[];
  metadata?: Record<string, any>; // Added to support custom mappings and other line-specific metadata
}

export interface TemplateMetadata {
  version: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  validationRules: ValidationRule[];
}

export interface LineFormatting {
  bold: boolean;
  italic: boolean;
  indentLevel: number;
  isSection: boolean;
  isSubtotal: boolean;
  isTotal: boolean;
}

export interface DisplayFormatting {
  currentPeriodDisplay: string;
  previousPeriodDisplay: string;
  showZeroValues: boolean;
  negativeFormat: 'parentheses' | 'minus';
  isWorkingCapitalLine: boolean;
}

export interface DisplayCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ValidationRule {
  ruleType: string;
  field: string;
  condition: string;
  message: string;
}

// ============================================================================
// EVENT DATA INTERFACES
// ============================================================================

export interface EventEntry {
  eventCode: string;
  facilityId: number;
  amount: number;
  entityType: EventType;
  reportingPeriodId: number;
}

export interface EventDataCollection {
  currentPeriod: EventEntry[];
  previousPeriod: EventEntry[];
  metadata: CollectionMetadata;
}

export interface CollectionMetadata {
  totalEvents: number;
  facilitiesIncluded: number[];
  periodsIncluded: number[];
  dataSources: EventType[];
  collectionTimestamp: Date;
}

// ============================================================================
// STATEMENT LINE INTERFACES
// ============================================================================

export interface StatementLine {
  id: string;
  description: string;
  note?: number;
  
  // Legacy fields (keep for backward compatibility)
  currentPeriodValue: number;
  previousPeriodValue: number;
  changeInCurrentPeriodValue?: number; // For working capital: change from previous to current
  changeInPreviousPeriodValue?: number; // For working capital: change in previous period (usually 0)
  
  // Three-column fields for NET_ASSETS_CHANGES
  accumulatedSurplus?: number | null;
  adjustments?: number | null;
  total?: number | null;
  
  variance?: VarianceInfo;
  formatting: LineFormatting;
  metadata: StatementLineMetadata;
  displayFormatting?: DisplayFormatting; // Added for enhanced display control
}

export interface VarianceInfo {
  absolute: number;
  percentage: number;
}

export interface StatementLineMetadata {
  lineCode: string;
  eventCodes: string[];
  formula?: string;
  isComputed: boolean;
  displayOrder: number;
  columnType?: ColumnType;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface FinancialStatementResponse {
  statement: StatementInfo;
  validation: ValidationResults;
  performance: PerformanceMetrics;
  aggregationMetadata?: any; // NEW: Aggregation metadata for facility-level statements
  facilityBreakdown?: any[]; // NEW: Optional facility breakdown for aggregated statements
  snapshotMetadata?: SnapshotMetadata; // Task 10: Snapshot metadata for display logic (Requirements: 3.4, 3.5)
}

// Task 10: Snapshot metadata interface (Requirements: 3.4, 3.5)
export interface SnapshotMetadata {
  isSnapshot: boolean; // True if displaying snapshot data, false if live data
  snapshotTimestamp: string | null; // ISO timestamp when snapshot was captured
  isOutdated: boolean; // True if source data has changed since snapshot
  reportId: number | null; // Associated report ID if applicable
  reportStatus?: string; // Report status (for snapshot data)
  version?: string; // Report version (for snapshot data)
}

export interface StatementInfo {
  statementCode: string;
  statementName: string;
  reportingPeriod: PeriodInfo;
  previousPeriod?: PeriodInfo;
  hasPreviousPeriodData: boolean;
  facility?: FacilityInfo;
  facilityAggregation?: FacilityAggregationInfo;
  generatedAt: string;
  lines: StatementLine[];
  totals: Record<string, number>;
  metadata: StatementMetadata;
}

export interface PeriodInfo {
  id: number;
  year: number;
  type: string;
  startDate: Date;
  endDate: Date;
}

export interface FacilityInfo {
  id: number;
  name: string;
  type: string;
  district?: string;
  hasData?: boolean;
}

export interface FacilityAggregationInfo {
  totalFacilities: number;
  facilitiesWithData: number;
  facilitiesWithoutData: number;
  aggregationMethod: 'SINGLE' | 'CROSS_FACILITY_SUM' | 'WEIGHTED_AVERAGE';
  facilityBreakdown: FacilityBreakdownItem[];
  warnings: string[];
}

export interface FacilityBreakdownItem {
  facility: FacilityInfo;
  totalAmount: number;
  eventBreakdown: Record<string, number>;
  contributionPercentage: number;
}

export interface StatementMetadata {
  templateVersion: string;
  calculationFormulas: Record<string, string>;
  validationResults: ValidationSummary;
  footnotes: FootnoteInfo[];
  carryforward?: {
    source: 'CARRYFORWARD' | 'CARRYFORWARD_AGGREGATED' | 'MANUAL_ENTRY' | 'FALLBACK';
    previousPeriodId?: number;
    previousPeriodEndingCash?: number;
    manualEntryAmount?: number;
    discrepancy?: number;
    facilityBreakdown?: Array<{
      facilityId: number;
      facilityName: string;
      endingCash: number;
    }>;
    timestamp?: string;
  };
}

export interface FootnoteInfo {
  number: number;
  text: string;
  relatedLines: string[];
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResults {
  isValid: boolean;
  accountingEquation: BalanceValidation;
  businessRules: BusinessRuleValidation[];
  warnings: string[];
  errors: string[];
}

export interface BalanceValidation {
  isValid: boolean;
  leftSide: number;
  rightSide: number;
  difference: number;
  equation: string;
}

export interface BusinessRuleValidation {
  ruleId: string;
  ruleName: string;
  isValid: boolean;
  message: string;
  affectedFields: string[];
}

export interface ValidationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningCount: number;
  errorCount: number;
}

// ============================================================================
// PERFORMANCE INTERFACES
// ============================================================================

export interface PerformanceMetrics {
  processingTimeMs: number;
  linesProcessed: number;
  eventsProcessed: number;
  formulasCalculated: number;
  // Performance logging for aggregation levels (Requirement 8.4, 8.5)
  aggregationLevel?: 'FACILITY' | 'DISTRICT' | 'PROVINCE';
  queryExecutionTimeMs?: number;
  dataCollectionTimeMs?: number;
  facilityBreakdownTimeMs?: number;
  aggregationMetadataTimeMs?: number;
}

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

export interface StatementGenerationRequest {
  statementCode: StatementCode;
  reportingPeriodId: number;
  projectType: string;
  facilityId?: number;
  includeComparatives: boolean;
  customMappings?: Record<string, any>;
}

export interface DataFilters {
  projectId: number;
  facilityId?: number;
  facilityIds?: number[]; // Array of facility IDs for district-based filtering
  reportingPeriodId: number;
  projectType?: string;
  entityTypes: EventType[];
}