// Statement Engine - Main Export File
export { StatementGeneratorEngine } from './core/statement-generator';
export { StatementFormulaEngine } from './core/formula-engine';
export { StatementLineProcessor } from './core/line-processor';
export { StatementValidator } from './core/validator';

// New Engine Foundations
export { TemplateEngine } from './engines/template-engine';
export { DataAggregationEngine } from './engines/data-aggregation-engine';
export { FormulaEngine } from './engines/formula-engine';

// Core Types
export type {
  StatementCode,
  EventType,
  FormulaOperation,
  StatementTemplate,
  TemplateLine,
  TemplateMetadata,
  LineFormatting,
  DisplayCondition,
  ValidationRule,
  EventEntry,
  EventDataCollection,
  CollectionMetadata,
  StatementLine,
  VarianceInfo,
  StatementLineMetadata,
  FinancialStatementResponse,
  StatementInfo,
  PeriodInfo,
  FacilityInfo,
  StatementMetadata,
  FootnoteInfo,
  ValidationResults,
  BalanceValidation,
  BusinessRuleValidation,
  ValidationSummary,
  PerformanceMetrics,
  StatementGenerationRequest,
  DataFilters,
} from './types/core.types';

// Engine Types
export type {
  TemplateProcessor,
  ValidationResult,
  TemplateCache,
  EventDataProcessor,
  EventAggregation,
  AggregationMetadata,
  PeriodComparison,
  VarianceCalculation,
  FormulaProcessor,
  FormulaContext,
  FinancialStatement,
  StatementProcessingMetadata,
  SumOperation,
  DiffOperation,
  ComputedBalanceOperation,
  DependencyGraph,
  DependencyNode,
  CircularDependencyError,
  CacheManager,
  EventDataCache,
  CalculationCache,
  ProcessingError,
  TemplateError,
  DataCollectionError,
  FormulaError,
} from './types/engine.types';

// Legacy Types (for backward compatibility)
export type {
  StatementContext,
  StatementOutput,
  StatementTotals,
} from './core/statement-generator';

export type {
  ComputationResult,
} from './core/formula-engine';

export type {
  StatementLineTemplate,
} from './core/line-processor';