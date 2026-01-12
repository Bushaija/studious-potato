# Financial Statement Generator Engine Blueprint

## 1. System Overview

### Core Architecture
```
Activities → Events → Statement Lines → Financial Statements
     ↓         ↓           ↓              ↓
  Raw Data → Standard → Computed → Final Reports
            Units      Values
```

### Design Principles
1. **Event-Centric**: All financial data flows through standardized events
2. **Metadata-Driven**: Statement structures defined in configuration, not code
3. **Rule-Based Mapping**: Flexible mapping rules between activities and events
4. **Formula Engine**: Dynamic computation of derived values
5. **Multi-Statement Support**: Same events can contribute to multiple statements

---

## 2. Data Architecture

### 2.1 Core Tables (Current Schema Analysis)

#### Events Table (Enhanced)
```sql
events {
  id: number
  code: string (unique) -- e.g., "GOODS_SERVICES", "CASH_EQUIVALENTS_END"
  description: string
  eventType: enum("REVENUE", "EXPENSE", "ASSET", "LIABILITY", "EQUITY")
  statementCodes: string[] -- which statements this event appears in
  balanceType: enum("DEBIT", "CREDIT", "BOTH") -- accounting nature
  displayOrder: number
  metadata: jsonb -- additional properties
}
```

#### Statement Templates (Enhanced)
```sql
enhancedStatementTemplates {
  id: number
  statementCode: string -- "REV_EXP", "ASSETS_LIAB", etc.
  statementName: string
  lineItem: string -- display name
  lineCode: string -- unique identifier within statement
  parentLineId: number -- for hierarchical structure
  displayOrder: number
  level: number -- indentation level (1=main, 2=sub, 3=sub-sub)
  
  -- Computation Rules
  eventMappings: jsonb -- array of event IDs that feed this line
  calculationFormula: string -- for computed lines
  aggregationMethod: string -- "SUM", "DIFFERENCE", "AVERAGE"
  
  -- Display Rules  
  isTotalLine: boolean
  isSubtotalLine: boolean
  displayConditions: jsonb -- when to show/hide
  formatRules: jsonb -- styling, currency format, etc.
  
  metadata: jsonb
  isActive: boolean
}
```

#### Event Mappings (Current Schema)
```sql
configurableEventMappings {
  eventId: number
  activityId: number -- specific activity
  categoryId: number -- or entire category
  projectType: enum
  facilityType: enum
  mappingType: enum("DIRECT", "COMPUTED", "AGGREGATED")
  mappingFormula: string -- for computed mappings
  mappingRatio: decimal -- for proportional splits
  effectiveFrom/To: timestamp -- time-based rules
}
```

---

## 3. Statement Generator Engine Components

### 3.1 Data Collection Layer

#### Purpose
Gather raw financial data from planning and execution modules

#### Key Functions
```typescript
interface DataCollector {
  collectPlanningData(filters: FilterCriteria): PlanningData[]
  collectExecutionData(filters: FilterCriteria): ExecutionData[]
  collectBalanceData(asOfDate: Date): BalanceData[]
}

interface FilterCriteria {
  projectId?: number
  facilityId?: number
  reportingPeriodId?: number
  dateRange?: DateRange
  projectType?: ProjectType
}
```

### 3.2 Event Aggregation Layer

#### Purpose
Transform activities into standardized events using mapping rules

#### Process Flow
1. **Apply Mapping Rules**: Activity → Event assignments
2. **Handle Multiple Mappings**: One activity can map to multiple events
3. **Apply Ratios**: Split activity values across events if needed
4. **Aggregate by Event**: Sum all activities mapped to same event

#### Key Functions
```typescript
interface EventAggregator {
  aggregateToEvents(
    activities: ActivityData[],
    mappings: EventMapping[],
    context: AggregationContext
  ): EventSummary[]
  
  applyMappingRules(
    activity: ActivityData,
    applicableMappings: EventMapping[]
  ): EventContribution[]
}

interface EventSummary {
  eventId: number
  eventCode: string
  eventType: EventType
  totalAmount: Decimal
  contributions: ActivityContribution[]
  metadata: any
}
```

### 3.3 Statement Computation Engine

#### Purpose
Transform event data into statement lines using templates

#### Process Flow
1. **Load Statement Template**: Get line definitions for target statement
2. **Map Events to Lines**: Apply eventMappings from template
3. **Compute Values**: Execute formulas for calculated lines
4. **Apply Hierarchy**: Build parent-child relationships
5. **Format Output**: Apply display and formatting rules

#### Key Functions
```typescript
interface StatementEngine {
  generateStatement(
    statementCode: string,
    eventData: EventSummary[],
    context: StatementContext
  ): StatementOutput
  
  computeFormula(
    formula: string,
    lineValues: Map<string, Decimal>,
    context: ComputationContext
  ): Decimal
  
  validateStatementIntegrity(statement: StatementOutput): ValidationResult[]
}

interface StatementOutput {
  statementCode: string
  statementName: string
  generatedDate: Date
  reportingPeriod: ReportingPeriod
  lines: StatementLine[]
  totals: StatementTotals
  metadata: StatementMetadata
}
```

### 3.4 Formula Computation Engine

#### Purpose
Handle dynamic calculations for computed lines

#### Supported Formula Types
1. **Simple Arithmetic**: `REV_TOTAL - EXP_TOTAL`
2. **Range Sums**: `SUM(REV_001:REV_004)`
3. **Conditional Logic**: `IF(CONDITION, VALUE_IF_TRUE, VALUE_IF_FALSE)`
4. **Cross-Statement References**: `PREV_PERIOD.CASH_END`
5. **Event Aggregations**: `SUM_EVENTS([EVENT_ID_1, EVENT_ID_2])`

#### Implementation Approach
```typescript
interface FormulaEngine {
  parseFormula(formula: string): FormulaAST
  evaluateFormula(
    ast: FormulaAST,
    context: EvaluationContext
  ): ComputationResult
  
  validateFormula(formula: string): ValidationResult
}

interface EvaluationContext {
  lineValues: Map<string, Decimal>
  eventValues: Map<string, Decimal>
  periodComparisons: Map<string, Decimal>
  constants: Map<string, any>
}
```

---

## 4. Statement Configuration Schema

### 4.1 Statement Metadata Structure

#### JSON Schema for Statement Definition
```typescript
interface StatementDefinition {
  statementCode: string
  statementName: string
  description: string
  statementType: "PERFORMANCE" | "POSITION" | "CASH_FLOW" | "COMPARISON"
  
  // Column definitions
  columns: ColumnDefinition[]
  
  // Line item structure
  sections: StatementSection[]
  
  // Validation rules
  validationRules: ValidationRule[]
  
  // Display preferences
  displayOptions: DisplayOptions
}

interface ColumnDefinition {
  columnCode: string
  columnName: string
  dataType: "CURRENCY" | "PERCENTAGE" | "TEXT" | "DATE"
  source: "CURRENT_PERIOD" | "PRIOR_PERIOD" | "BUDGET" | "COMPUTED"
  format: FormatOptions
}

interface StatementSection {
  sectionCode: string
  sectionName: string
  displayOrder: number
  level: number
  lines: LineDefinition[]
}

interface LineDefinition {
  lineCode: string
  lineItem: string
  displayOrder: number
  level: number
  
  // Data source
  eventMappings?: string[] // event codes
  calculationFormula?: string
  aggregationMethod: "SUM" | "DIFFERENCE" | "AVERAGE" | "MAX" | "MIN"
  
  // Display properties
  isTotalLine: boolean
  isSubtotalLine: boolean
  displayConditions?: ConditionalDisplay[]
  formatRules: FormatRules
}
```

### 4.2 Example: Revenue & Expenditure Statement Config

```json
{
  "statementCode": "REV_EXP",
  "statementName": "Statement of Revenue and Expenditure", 
  "statementType": "PERFORMANCE",
  "columns": [
    {
      "columnCode": "DESCRIPTION",
      "columnName": "Description",
      "dataType": "TEXT"
    },
    {
      "columnCode": "NOTE",
      "columnName": "Note",
      "dataType": "TEXT"
    },
    {
      "columnCode": "CURRENT_FY",
      "columnName": "FY 2025/2026 (FRW)",
      "dataType": "CURRENCY",
      "source": "CURRENT_PERIOD"
    },
    {
      "columnCode": "PRIOR_FY", 
      "columnName": "FY 2024/2025 (FRW)",
      "dataType": "CURRENCY",
      "source": "PRIOR_PERIOD"
    }
  ],
  "sections": [
    {
      "sectionCode": "REVENUE",
      "sectionName": "1. REVENUES",
      "displayOrder": 1,
      "level": 1,
      "lines": [
        {
          "lineCode": "REV_GRANTS",
          "lineItem": "Grants",
          "displayOrder": 2,
          "level": 2,
          "eventMappings": ["GRANTS"],
          "aggregationMethod": "SUM",
          "isTotalLine": false,
          "formatRules": {
            "showZeroAs": "-",
            "currencySymbol": "FRW"
          }
        },
        {
          "lineCode": "REV_TRANSFERS",
          "lineItem": "Transfers from public entities",
          "displayOrder": 3,
          "level": 2,
          "eventMappings": ["TRANSFERS_PUBLIC_ENTITIES"],
          "aggregationMethod": "SUM",
          "isTotalLine": false
        },
        {
          "lineCode": "REV_TOTAL",
          "lineItem": "TOTAL REVENUE",
          "displayOrder": 10,
          "level": 2,
          "calculationFormula": "SUM(REV_GRANTS, REV_TRANSFERS, REV_OTHER)",
          "isTotalLine": true,
          "formatRules": {
            "bold": true,
            "underline": true
          }
        }
      ]
    }
  ],
  "validationRules": [
    {
      "ruleCode": "BALANCE_CHECK",
      "formula": "REVENUE_TOTAL - EXPENSE_TOTAL = SURPLUS_DEFICIT",
      "errorMessage": "Revenue minus expenses must equal surplus/deficit"
    }
  ]
}
```

---

## 5. Implementation Strategy

### 5.1 Phase 1: Core Engine (Weeks 1-3)

#### Week 1: Foundation
- [ ] Enhanced Events table structure
- [ ] Statement templates schema refinement
- [ ] Basic data collection layer
- [ ] Event aggregation logic

#### Week 2: Computation Engine  
- [ ] Formula parser implementation
- [ ] Basic arithmetic operations
- [ ] Line value computation
- [ ] Statement line generation

#### Week 3: Integration & Testing
- [ ] End-to-end statement generation
- [ ] Revenue & Expenditure statement
- [ ] Basic validation rules
- [ ] Unit testing framework

### 5.2 Phase 2: Extended Functionality (Weeks 4-6)

#### Week 4: Advanced Formulas
- [ ] Range operations (SUM, AVERAGE)
- [ ] Conditional logic (IF statements)
- [ ] Cross-period comparisons
- [ ] Event aggregation functions

#### Week 5: Multiple Statements
- [ ] Assets & Liabilities statement
- [ ] Cash Flow statement  
- [ ] Statement template management
- [ ] Cross-statement validation

#### Week 6: Configuration Management
- [ ] Statement definition UI
- [ ] Template versioning
- [ ] Mapping rule management
- [ ] Admin configuration tools

### 5.3 Phase 3: Advanced Features (Weeks 7-8)

#### Week 7: Performance & Optimization
- [ ] Caching strategy for computations
- [ ] Batch processing for large datasets
- [ ] Performance monitoring
- [ ] Query optimization

#### Week 8: Extended Reporting  
- [ ] Budget vs Actual statements
- [ ] Multi-period comparisons
- [ ] Drill-down capabilities
- [ ] Export functionality

---

## 6. API Design

### 6.1 Statement Generation API

```typescript
// Primary endpoint for generating statements
POST /api/statements/generate
{
  "statementCode": "REV_EXP",
  "projectId": 123,
  "facilityId": 456, 
  "reportingPeriodId": 789,
  "includeComparativePeriod": true,
  "outputFormat": "JSON" | "PDF" | "EXCEL"
}

// Response
{
  "statement": StatementOutput,
  "generationTime": "2024-01-15T10:30:00Z",
  "dataSourceSummary": {
    "activitiesProcessed": 245,
    "eventsGenerated": 12,
    "linesComputed": 35
  },
  "validationResults": ValidationResult[]
}
```

### 6.2 Configuration Management API

```typescript
// Manage statement templates
GET /api/statements/templates
POST /api/statements/templates
PUT /api/statements/templates/{id}
DELETE /api/statements/templates/{id}

// Manage event mappings
GET /api/events/mappings
POST /api/events/mappings
PUT /api/events/mappings/{id}

// Validate configurations
POST /api/statements/validate-template
POST /api/events/validate-mapping
```

---

## 7. Error Handling & Validation

### 7.1 Data Validation
- **Missing Data**: Handle cases where expected activities/events are missing
- **Invalid Mappings**: Detect circular references in formulas
- **Type Mismatches**: Ensure data types match expected formats
- **Date Inconsistencies**: Validate reporting period boundaries

### 7.2 Statement Integrity Checks
- **Balance Validation**: Assets = Liabilities + Equity
- **Cash Flow Reconciliation**: Opening + Net Change = Closing
- **Cross-Statement Consistency**: Same events produce consistent values
- **Formula Validation**: Detect division by zero, undefined references

### 7.3 Error Recovery
- **Partial Generation**: Generate statements even with some missing data
- **Default Values**: Use configurable defaults for missing values
- **Warning vs Error**: Distinguish between critical errors and warnings
- **Audit Trail**: Log all computation steps for debugging

---

## 8. Performance Considerations

### 8.1 Optimization Strategies
- **Computation Caching**: Cache intermediate results to avoid recalculation
- **Lazy Loading**: Load statement templates and mappings on demand
- **Batch Processing**: Process multiple statements in parallel
- **Database Indexing**: Optimize queries for event aggregation

### 8.2 Scalability Factors
- **Memory Usage**: Monitor memory consumption for large datasets
- **Computation Complexity**: Optimize formula evaluation algorithms  
- **Concurrent Access**: Handle multiple users generating statements simultaneously
- **Data Volume**: Plan for growth in activities and reporting periods

---

## 9. Testing Strategy

### 9.1 Unit Testing
- **Formula Engine**: Test all supported formula types and edge cases
- **Event Aggregation**: Verify mapping rules and aggregation logic
- **Statement Generation**: Test each statement type independently
- **Validation Rules**: Test integrity checks and error conditions

### 9.2 Integration Testing  
- **End-to-End Workflows**: Complete statement generation processes
- **Cross-Statement Consistency**: Verify data consistency across statements
- **Multi-Project Support**: Test with different project types and facility types
- **Performance Testing**: Load testing with realistic data volumes

### 9.3 User Acceptance Testing
- **Statement Accuracy**: Verify output matches manual calculations
- **Configuration Flexibility**: Test ease of adding new statements
- **Error Handling**: Verify appropriate error messages and recovery
- **Performance**: Ensure acceptable generation times

---

## 10. Migration Strategy

### 10.1 Current State Analysis
Your existing schema already has most required components:
- ✅ Events table with proper structure
- ✅ Dynamic activities with flexible mapping
- ✅ Configurable event mappings
- ✅ Enhanced statement templates (needs refinement)
- ✅ Form schemas for data collection

### 10.2 Required Enhancements
1. **Statement Templates**: Add formula and computation fields
2. **Event Mappings**: Enhance with time-based and conditional rules  
3. **New Tables**: Add statement definitions and computation cache
4. **Data Migration**: Migrate existing hardcoded statement logic

### 10.3 Rollout Plan
1. **Parallel Development**: Build engine alongside existing system
2. **Shadow Testing**: Run both old and new systems in parallel
3. **Gradual Migration**: Start with one statement type, expand gradually
4. **Fallback Strategy**: Maintain old system until new one is fully validated

---

## Conclusion

This blueprint provides a comprehensive foundation for building a scalable, rule-based Financial Statement Generator Engine. The design leverages your existing schema while adding the necessary components for dynamic statement generation.

Key advantages of this approach:
- **Maintainability**: Statement changes require configuration updates, not code changes
- **Extensibility**: Easy to add new statement types and business rules
- **Consistency**: Standardized event model ensures data consistency across statements
- **Flexibility**: Support for complex formulas and conditional logic
- **Scalability**: Architecture supports growth in data volume and statement complexity

The phased implementation approach allows for iterative development and validation, ensuring the system meets requirements while maintaining stability.