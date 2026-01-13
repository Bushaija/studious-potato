/**
 * Engine-specific TypeScript interfaces for Financial Statement Generation
 * Template Engine, Data Aggregation Engine, and Formula Engine types
 */

import { 
  StatementTemplate, 
  TemplateLine, 
  EventEntry, 
  EventDataCollection,
  StatementLine,
  ValidationResults,
  EventType
} from './core.types';

// ============================================================================
// TEMPLATE ENGINE INTERFACES
// ============================================================================

export interface TemplateProcessor {
  loadTemplate(statementCode: string): Promise<StatementTemplate>;
  validateTemplate(template: StatementTemplate): ValidationResult;
  buildLineHierarchy(templateLines: TemplateLine[]): StatementLine[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateCache {
  get(statementCode: string): StatementTemplate | null;
  set(statementCode: string, template: StatementTemplate): void;
  invalidate(statementCode: string): void;
  clear(): void;
}

// ============================================================================
// DATA AGGREGATION ENGINE INTERFACES
// ============================================================================

export interface EventDataProcessor {
  collectEventData(
    filters: DataFilters,
    eventCodes: string[]
  ): Promise<EventDataCollection>;
  
  aggregateByEvent(
    eventData: EventDataCollection
  ): Promise<EventAggregation>;
  
  calculatePeriodComparisons(
    currentPeriod: EventAggregation,
    previousPeriod: EventAggregation
  ): PeriodComparison;
}

export interface DataFilters {
  projectId: number;
  facilityId?: number;
  facilityIds?: number[];
  reportingPeriodId: number;
  projectType?: string;
  entityTypes: EventType[];
}

export interface EventAggregation {
  eventTotals: Map<string, number>;
  facilityTotals: Map<number, number>;
  periodTotals: Map<number, number>;
  metadata: AggregationMetadata;
}

export interface AggregationMetadata {
  totalEvents: number;
  totalFacilities: number;
  totalAmount: number;
  aggregationMethod: string;
  processingTime: number;
}

export interface PeriodComparison {
  currentPeriod: EventAggregation;
  previousPeriod: EventAggregation;
  variances: Map<string, VarianceCalculation>;
}

export interface VarianceCalculation {
  absolute: number;
  percentage: number;
  trend: 'increase' | 'decrease' | 'stable';
}

// ============================================================================
// FORMULA ENGINE INTERFACES
// ============================================================================

export interface FormulaProcessor {
  evaluateFormula(
    formula: string,
    context: FormulaContext
  ): Promise<number>;
  
  resolveDependencies(
    lines: StatementLine[]
  ): StatementLine[];
  
  validateCalculations(
    statement: FinancialStatement
  ): ValidationResults;
}

export interface FormulaContext {
  eventValues: Map<string, number>;
  lineValues: Map<string, number>;
  previousPeriodValues: Map<string, number>;
  customMappings?: Record<string, any>;
  balanceSheet?: {
    current: Map<string, number>;  // Event code → Amount
    previous: Map<string, number>; // Event code → Amount
  };
  crossStatementValues?: {
    surplusDeficit?: number;           // TOTAL_REVENUE - TOTAL_EXPENSES from R&E
    previousSurplusDeficit?: number;   // Previous period surplus/deficit
  };
}

export interface FinancialStatement {
  statementCode: string;
  lines: StatementLine[];
  totals: Record<string, number>;
  metadata: StatementProcessingMetadata;
}

export interface StatementProcessingMetadata {
  templateId: number;
  processingStartTime: Date;
  processingEndTime: Date;
  formulasEvaluated: number;
  dependenciesResolved: number;
}

// ============================================================================
// FORMULA OPERATION INTERFACES
// ============================================================================

export interface FormulaOperation {
  type: 'SUM' | 'DIFF' | 'COMPUTED_BALANCE' | 'CUSTOM';
  operands: string[];
  result?: number;
  error?: string;
  originalFormula?: string; // Store original formula for arithmetic evaluation
}

export interface SumOperation extends FormulaOperation {
  type: 'SUM';
  eventCodes: string[];
}

export interface DiffOperation extends FormulaOperation {
  type: 'DIFF';
  minuend: string;
  subtrahend: string;
}

export interface ComputedBalanceOperation extends FormulaOperation {
  type: 'COMPUTED_BALANCE';
  equation: string; // e.g., "Assets = Liabilities + Equity"
  leftSide: string[];
  rightSide: string[];
}

// ============================================================================
// DEPENDENCY RESOLUTION INTERFACES
// ============================================================================

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, string[]>;
  resolved: string[];
  unresolved: string[];
}

export interface DependencyNode {
  lineCode: string;
  formula?: string;
  dependencies: string[];
  dependents: string[];
  resolved: boolean;
}

export interface CircularDependencyError {
  cycle: string[];
  message: string;
}

// ============================================================================
// CACHING INTERFACES
// ============================================================================

export interface CacheManager {
  templates: TemplateCache;
  eventData: EventDataCache;
  calculations: CalculationCache;
}

export interface EventDataCache {
  get(key: string): EventDataCollection | null;
  set(key: string, data: EventDataCollection, ttl?: number): void;
  invalidate(pattern: string): void;
  clear(): void;
}

export interface CalculationCache {
  get(formulaHash: string): number | null;
  set(formulaHash: string, result: number, ttl?: number): void;
  invalidate(pattern: string): void;
  clear(): void;
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface ProcessingError {
  code: string;
  message: string;
  context: Record<string, any>;
  timestamp: Date;
  severity: 'error' | 'warning' | 'info';
}

export interface TemplateError extends ProcessingError {
  templateId: number;
  lineId?: number;
  validationFailures: string[];
}

export interface DataCollectionError extends ProcessingError {
  filters: DataFilters;
  eventCodes: string[];
  missingEvents: string[];
}

export interface FormulaError extends ProcessingError {
  formula: string;
  lineCode: string;
  dependencies: string[];
  evaluationError: string;
}