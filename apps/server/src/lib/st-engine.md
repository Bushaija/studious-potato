# Financial Statement Engine - Core Project Structure

## Directory Structure

```
src/
├── lib/
│   ├── statement-engine/
│   │   ├── core/
│   │   │   ├── engine.ts                    # Main StatementEngine class
│   │   │   ├── data-collector.ts            # DataCollector interface & implementation
│   │   │   ├── event-aggregator.ts          # EventAggregator for activity→event mapping
│   │   │   ├── formula-engine.ts            # FormulaEngine for calculations
│   │   │   └── statement-generator.ts       # StatementGenerator for final output
│   │   ├── repositories/
│   │   │   ├── event-repository.ts          # Event data access
│   │   │   ├── template-repository.ts       # Statement template access
│   │   │   ├── mapping-repository.ts        # Event mapping access
│   │   │   ├── activity-repository.ts       # Activity data access
│   │   │   └── form-data-repository.ts      # Form data access
│   │   ├── services/
│   │   │   ├── validation-service.ts        # Statement validation logic
│   │   │   ├── cache-service.ts             # Computation caching
│   │   │   ├── audit-service.ts             # Audit trail logging
│   │   │   └── export-service.ts            # Statement export functionality
│   │   ├── types/
│   │   │   ├── statement-types.ts           # Core statement interfaces
│   │   │   ├── engine-types.ts              # Engine-specific types
│   │   │   ├── formula-types.ts             # Formula evaluation types
│   │   │   ├── mapping-types.ts             # Mapping configuration types
│   │   │   └── validation-types.ts          # Validation result types
│   │   ├── utils/
│   │   │   ├── formula-parser.ts            # Formula parsing utilities
│   │   │   ├── aggregation-helpers.ts       # Data aggregation utilities
│   │   │   ├── validation-helpers.ts        # Validation utilities
│   │   │   └── format-helpers.ts            # Output formatting utilities
│   │   └── config/
│   │       ├── statement-definitions.ts     # Built-in statement configurations
│   │       ├── default-mappings.ts          # Default event mappings
│   │       └── validation-rules.ts          # Standard validation rules
├── api/
│   ├── statements/
│   │   ├── generate/
│   │   │   └── route.ts                     # POST /api/statements/generate
│   │   ├── templates/
│   │   │   └── route.ts                     # Statement template CRUD
│   │   ├── validate/
│   │   │   └── route.ts                     # Statement validation endpoint
│   │   └── export/
│   │       └── route.ts                     # Statement export endpoint
│   ├── events/
│   │   ├── mappings/
│   │   │   └── route.ts                     # Event mapping management
│   │   └── validate/
│   │       └── route.ts                     # Event mapping validation
│   └── config/
│       ├── schemas/
│       │   └── route.ts                     # Form schema management
│       └── activities/
│           └── route.ts                     # Dynamic activity management
└── tests/
    ├── statement-engine/
    │   ├── core/
    │   ├── services/
    │   └── integration/
    └── fixtures/
        ├── sample-data/
        ├── test-mappings/
        └── expected-outputs/
```

## Core Engine Components

### 1. Main Engine Class (`src/lib/statement-engine/core/engine.ts`)

```typescript
import { StatementEngine } from './statement-generator'
import { DataCollector } from './data-collector'
import { EventAggregator } from './event-aggregator'
import { FormulaEngine } from './formula-engine'
import { ValidationService } from '../services/validation-service'
import { CacheService } from '../services/cache-service'

export class FinancialStatementEngine {
  constructor(
    private dataCollector: DataCollector,
    private eventAggregator: EventAggregator,
    private formulaEngine: FormulaEngine,
    private statementGenerator: StatementEngine,
    private validationService: ValidationService,
    private cacheService: CacheService
  ) {}

  async generateStatement(request: StatementGenerationRequest): Promise<StatementOutput> {
    // Implementation follows blueprint workflow
  }

  async validateStatement(statement: StatementOutput): Promise<ValidationResult[]> {
    // Statement integrity validation
  }
}
```

### 2. Data Collector (`src/lib/statement-engine/core/data-collector.ts`)

```typescript
import { FilterCriteria, PlanningData, ExecutionData, BalanceData } from '../types/engine-types'

export interface DataCollector {
  collectPlanningData(filters: FilterCriteria): Promise<PlanningData[]>
  collectExecutionData(filters: FilterCriteria): Promise<ExecutionData[]>
  collectBalanceData(asOfDate: Date, filters: FilterCriteria): Promise<BalanceData[]>
}

export class DatabaseDataCollector implements DataCollector {
  constructor(
    private formDataRepository: FormDataRepository,
    private activityRepository: ActivityRepository
  ) {}

  async collectPlanningData(filters: FilterCriteria): Promise<PlanningData[]> {
    // Query schema_form_data_entries for planning module data
    // Transform JSON form data to structured activity data
  }

  async collectExecutionData(filters: FilterCriteria): Promise<ExecutionData[]> {
    // Query schema_form_data_entries for execution module data
    // Handle quarterly execution data aggregation
  }

  async collectBalanceData(asOfDate: Date, filters: FilterCriteria): Promise<BalanceData[]> {
    // Calculate running balances from execution data
    // Apply accounting equation validation
  }
}
```

### 3. Event Aggregator (`src/lib/statement-engine/core/event-aggregator.ts`)

```typescript
import { EventMapping, ActivityData, EventSummary } from '../types/engine-types'

export class EventAggregator {
  constructor(
    private mappingRepository: MappingRepository,
    private eventRepository: EventRepository
  ) {}

  async aggregateToEvents(
    activities: ActivityData[],
    context: AggregationContext
  ): Promise<EventSummary[]> {
    const mappings = await this.mappingRepository.getApplicableMappings(context)
    const eventMap = new Map<string, EventSummary>()

    for (const activity of activities) {
      const applicableMappings = this.findApplicableMappings(activity, mappings)
      
      for (const mapping of applicableMappings) {
        const contribution = this.calculateContribution(activity, mapping)
        this.addToEventSummary(eventMap, contribution)
      }
    }

    return Array.from(eventMap.values())
  }

  private findApplicableMappings(
    activity: ActivityData, 
    mappings: EventMapping[]
  ): EventMapping[] {
    // Apply mapping rules based on activity properties
    // Handle direct, computed, and aggregated mappings
  }

  private calculateContribution(
    activity: ActivityData, 
    mapping: EventMapping
  ): EventContribution {
    // Calculate how much this activity contributes to the event
    // Apply mapping ratios and formulas
  }
}
```

### 4. Formula Engine (`src/lib/statement-engine/core/formula-engine.ts`)

```typescript
import { FormulaAST, EvaluationContext, ComputationResult } from '../types/formula-types'

export class FormulaEngine {
  constructor(private parser: FormulaParser) {}

  async evaluateFormula(
    formula: string,
    context: EvaluationContext
  ): Promise<ComputationResult> {
    try {
      const ast = this.parser.parse(formula)
      return await this.evaluate(ast, context)
    } catch (error) {
      return {
        success: false,
        error: `Formula evaluation failed: ${error.message}`,
        value: 0
      }
    }
  }

  private async evaluate(ast: FormulaAST, context: EvaluationContext): Promise<ComputationResult> {
    switch (ast.type) {
      case 'ARITHMETIC':
        return this.evaluateArithmetic(ast, context)
      case 'SUM_RANGE':
        return this.evaluateSumRange(ast, context)
      case 'CONDITIONAL':
        return this.evaluateConditional(ast, context)
      case 'EVENT_AGGREGATION':
        return this.evaluateEventAggregation(ast, context)
      default:
        throw new Error(`Unsupported formula type: ${ast.type}`)
    }
  }

  validateFormula(formula: string): ValidationResult {
    // Parse and validate formula syntax
    // Check for circular references
    // Validate referenced line codes and events
  }
}
```

### 5. Statement Generator (`src/lib/statement-engine/core/statement-generator.ts`)

```typescript
import { StatementTemplate, EventSummary, StatementOutput } from '../types/statement-types'

export class StatementGenerator {
  constructor(
    private templateRepository: TemplateRepository,
    private formulaEngine: FormulaEngine
  ) {}

  async generateStatement(
    statementCode: string,
    eventData: EventSummary[],
    context: StatementContext
  ): Promise<StatementOutput> {
    const template = await this.templateRepository.getStatementTemplate(statementCode)
    const lines = await this.generateLines(template, eventData, context)
    
    return {
      statementCode,
      statementName: template.statementName,
      generatedDate: new Date(),
      reportingPeriod: context.reportingPeriod,
      lines,
      totals: this.calculateTotals(lines),
      metadata: this.buildMetadata(template, context)
    }
  }

  private async generateLines(
    template: StatementTemplate,
    eventData: EventSummary[],
    context: StatementContext
  ): Promise<StatementLine[]> {
    const lines: StatementLine[] = []
    const eventMap = new Map(eventData.map(e => [e.eventCode, e]))
    const lineValues = new Map<string, Decimal>()

    // Process lines in display order
    const sortedLines = template.lines.sort((a, b) => a.displayOrder - b.displayOrder)
    
    for (const lineTemplate of sortedLines) {
      const line = await this.generateLine(lineTemplate, eventMap, lineValues, context)
      lines.push(line)
      
      // Store computed value for formula references
      if (line.lineCode) {
        lineValues.set(line.lineCode, line.currentValue)
      }
    }

    return lines
  }

  private async generateLine(
    lineTemplate: LineTemplate,
    eventMap: Map<string, EventSummary>,
    lineValues: Map<string, Decimal>,
    context: StatementContext
  ): Promise<StatementLine> {
    let value = new Decimal(0)

    if (lineTemplate.eventMappings && lineTemplate.eventMappings.length > 0) {
      // Aggregate from events
      value = this.aggregateFromEvents(lineTemplate.eventMappings, eventMap)
    } else if (lineTemplate.calculationFormula) {
      // Compute from formula
      const result = await this.formulaEngine.evaluateFormula(
        lineTemplate.calculationFormula,
        { lineValues, eventValues: eventMap, ...context }
      )
      value = result.success ? result.value : new Decimal(0)
    }

    return {
      lineCode: lineTemplate.lineCode,
      lineItem: lineTemplate.lineItem,
      level: lineTemplate.level,
      currentValue: value,
      priorValue: await this.getPriorPeriodValue(lineTemplate, context),
      displayOrder: lineTemplate.displayOrder,
      isTotalLine: lineTemplate.isTotalLine,
      metadata: lineTemplate.metadata
    }
  }
}
```

## Repository Layer

### Event Repository (`src/lib/statement-engine/repositories/event-repository.ts`)

```typescript
export class EventRepository {
  constructor(private db: Database) {}

  async getEvents(): Promise<Event[]> {
    return await this.db
      .select()
      .from(events)
      .where(eq(events.isCurrent, true))
      .orderBy(events.displayOrder)
  }

  async getEventByCode(code: string): Promise<Event | null> {
    const result = await this.db
      .select()
      .from(events)
      .where(and(eq(events.code, code), eq(events.isCurrent, true)))
      .limit(1)
    
    return result[0] || null
  }

  async getEventsByStatementCode(statementCode: string): Promise<Event[]> {
    return await this.db
      .select()
      .from(events)
      .where(
        and(
          sql`${events.statementCodes} @> ARRAY[${statementCode}]`,
          eq(events.isCurrent, true)
        )
      )
      .orderBy(events.displayOrder)
  }
}
```

### Template Repository (`src/lib/statement-engine/repositories/template-repository.ts`)

```typescript
export class TemplateRepository {
  constructor(private db: Database) {}

  async getStatementTemplate(statementCode: string): Promise<StatementTemplate> {
    const lines = await this.db
      .select()
      .from(enhancedStatementTemplates)
      .where(
        and(
          eq(enhancedStatementTemplates.statementCode, statementCode),
          eq(enhancedStatementTemplates.isActive, true)
        )
      )
      .orderBy(enhancedStatementTemplates.displayOrder)

    if (lines.length === 0) {
      throw new Error(`Statement template not found: ${statementCode}`)
    }

    return {
      statementCode,
      statementName: lines[0].statementName,
      lines: lines.map(this.mapToLineTemplate)
    }
  }

  private mapToLineTemplate(row: any): LineTemplate {
    return {
      id: row.id,
      lineCode: row.lineCode,
      lineItem: row.lineItem,
      parentLineId: row.parentLineId,
      displayOrder: row.displayOrder,
      level: row.level,
      eventMappings: row.eventMappings,
      calculationFormula: row.calculationFormula,
      aggregationMethod: row.aggregationMethod,
      isTotalLine: row.isTotalLine,
      isSubtotalLine: row.isSubtotalLine,
      displayConditions: row.displayConditions,
      formatRules: row.formatRules,
      metadata: row.metadata
    }
  }
}
```

## Service Layer Integration

### API Route (`src/api/statements/generate/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { FinancialStatementEngine } from '@/lib/statement-engine/core/engine'
import { createStatementEngine } from '@/lib/statement-engine/factory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { statementCode, projectId, facilityId, reportingPeriodId, includeComparativePeriod } = body

    // Validate request
    if (!statementCode || !projectId || !facilityId || !reportingPeriodId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create engine instance
    const engine = await createStatementEngine()

    // Generate statement
    const result = await engine.generateStatement({
      statementCode,
      projectId,
      facilityId,
      reportingPeriodId,
      includeComparativePeriod,
      outputFormat: 'JSON'
    })

    return NextResponse.json({
      success: true,
      statement: result.statement,
      generationTime: result.generationTime,
      metadata: result.metadata
    })
  } catch (error) {
    console.error('Statement generation failed:', error)
    return NextResponse.json(
      { error: 'Statement generation failed', details: error.message },
      { status: 500 }
    )
  }
}
```

## Factory Pattern for Dependency Injection

### Engine Factory (`src/lib/statement-engine/factory.ts`)

```typescript
import { db } from '@/db'
import { FinancialStatementEngine } from './core/engine'
import { DatabaseDataCollector } from './core/data-collector'
import { EventAggregator } from './core/event-aggregator'
import { FormulaEngine } from './core/formula-engine'
import { StatementGenerator } from './core/statement-generator'
import { ValidationService } from './services/validation-service'
import { CacheService } from './services/cache-service'

// Repositories
import { EventRepository } from './repositories/event-repository'
import { TemplateRepository } from './repositories/template-repository'
import { MappingRepository } from './repositories/mapping-repository'
import { ActivityRepository } from './repositories/activity-repository'
import { FormDataRepository } from './repositories/form-data-repository'

export async function createStatementEngine(): Promise<FinancialStatementEngine> {
  // Initialize repositories
  const eventRepository = new EventRepository(db)
  const templateRepository = new TemplateRepository(db)
  const mappingRepository = new MappingRepository(db)
  const activityRepository = new ActivityRepository(db)
  const formDataRepository = new FormDataRepository(db)

  // Initialize core components
  const dataCollector = new DatabaseDataCollector(formDataRepository, activityRepository)
  const eventAggregator = new EventAggregator(mappingRepository, eventRepository)
  const formulaEngine = new FormulaEngine()
  const statementGenerator = new StatementGenerator(templateRepository, formulaEngine)

  // Initialize services
  const validationService = new ValidationService(eventRepository)
  const cacheService = new CacheService()

  // Create and return engine
  return new FinancialStatementEngine(
    dataCollector,
    eventAggregator,
    formulaEngine,
    statementGenerator,
    validationService,
    cacheService
  )
}
```

This structure provides:

1. **Separation of Concerns**: Each component has a clear responsibility
2. **Dependency Injection**: Easy to test and configure different implementations
3. **Repository Pattern**: Clean data access layer
4. **Service Layer**: Cross-cutting concerns like validation and caching
5. **Type Safety**: Strong TypeScript interfaces throughout
6. **Extensibility**: Easy to add new statement types and computation rules
7. **Testing**: Structure supports unit and integration testing

The next steps would be to implement each component following the interfaces and patterns established here. Would you like me to dive deeper into any specific component or move on to implementing the actual classes?