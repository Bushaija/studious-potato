# Financial Statement Generator Engine - Tailored Blueprint

## 1. System Overview

### Current Architecture Analysis
Your existing system already has excellent foundations:
- ✅ **Database Layer**: Well-structured with `dynamic_activities`, `events`, `configurable_event_mappings`, `statement_templates`, `financial_reports`
- ✅ **API Layer**: Complete CRUD operations for financial reports with validation and export
- ✅ **Data Flow**: Activities → Events → Statement Lines → Financial Reports
- ✅ **Event Mapping**: Fixed execution activity mappings to `GOODS_SERVICES` event

### Enhanced Architecture
```
Raw Data (Form Entries) → Activities → Events → Statement Lines → Financial Statements
     ↓                      ↓         ↓           ↓              ↓
Planning/Execution → Dynamic → Standard → Computed → Final Reports
   Data Entries     Activities  Events    Values
```

## 2. Core Components

### 2.1 Statement Definition Engine
**Purpose**: Define statement structures dynamically without code changes

#### Enhanced Statement Templates Schema
```typescript
interface StatementTemplate {
  id: number;
  statementCode: string; // "REV_EXP", "ASSETS_LIAB", "CASH_FLOW", etc.
  statementName: string;
  lineItem: string;
  lineCode: string;
  parentLineId?: number;
  displayOrder: number;
  level: number; // 1=main, 2=sub, 3=sub-sub
  
  // Data Mapping
  eventMappings: string[]; // Event codes that feed this line
  calculationFormula?: string; // For computed lines
  aggregationMethod: 'SUM' | 'DIFFERENCE' | 'AVERAGE';
  
  // Display Rules
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  displayConditions: Record<string, any>;
  formatRules: Record<string, any>;
  
  // Column Configuration
  columns: ColumnDefinition[];
}
```

#### Column Definitions
```typescript
interface ColumnDefinition {
  columnCode: string; // "DESCRIPTION", "NOTE", "CURRENT_FY", "PRIOR_FY"
  columnName: string;
  dataType: "TEXT" | "CURRENCY" | "PERCENTAGE" | "NUMBER";
  source: "STATIC" | "CURRENT_PERIOD" | "PRIOR_PERIOD" | "COMPUTED";
  format: FormatOptions;
}
```

### 2.2 Data Collection Engine
**Purpose**: Gather and aggregate financial data from multiple sources

#### Data Sources
1. **Planning Data**: From `schema_form_data_entries` where `entity_type = 'planning'`
2. **Execution Data**: From `schema_form_data_entries` where `entity_type = 'execution'`
3. **Event Mappings**: From `configurable_event_mappings` table
4. **Activities**: From `dynamic_activities` table

#### Collection Process
```typescript
interface DataCollector {
  collectFormData(filters: FilterCriteria): FormDataEntry[];
  aggregateByEvents(data: FormDataEntry[]): EventSummary[];
  applyEventMappings(activities: ActivityData[], mappings: EventMapping[]): EventContribution[];
}
```

### 2.3 Statement Computation Engine
**Purpose**: Transform event data into statement lines using templates

#### Computation Flow
1. **Load Statement Template**: Get line definitions for target statement
2. **Map Events to Lines**: Apply `eventMappings` from template
3. **Compute Values**: Execute formulas for calculated lines
4. **Apply Hierarchy**: Build parent-child relationships
5. **Format Output**: Apply display and formatting rules

#### Formula Engine
```typescript
interface FormulaEngine {
  // Supported formula types
  evaluateFormula(formula: string, context: EvaluationContext): number;
  
  // Formula examples:
  // "SUM(REV_GRANTS, REV_TRANSFERS)" - Simple arithmetic
  // "CURRENT_FY - PRIOR_FY" - Period comparison
  // "IF(TOTAL_REVENUE > 0, TOTAL_REVENUE, 0)" - Conditional logic
}
```

## 3. Statement Types Implementation

### 3.1 Statement of Revenue and Expenditure
```typescript
const revenueExpenditureTemplate = {
  statementCode: "REV_EXP",
  statementName: "Statement of Revenue and Expenditure",
  columns: [
    { columnCode: "DESCRIPTION", columnName: "Description", dataType: "TEXT" },
    { columnCode: "NOTE", columnName: "Note", dataType: "NUMBER" },
    { columnCode: "CURRENT_FY", columnName: "FY 2025/2026 (FRW)", dataType: "CURRENCY" },
    { columnCode: "PRIOR_FY", columnName: "FY 2024/2025 (FRW)", dataType: "CURRENCY" }
  ],
  lines: [
    {
      lineCode: "REV_GRANTS",
      lineItem: "Grants",
      level: 2,
      eventMappings: ["GRANTS"],
      aggregationMethod: "SUM"
    },
    {
      lineCode: "REV_TOTAL",
      lineItem: "TOTAL REVENUE",
      level: 2,
      calculationFormula: "SUM(REV_GRANTS, REV_TRANSFERS, REV_OTHER)",
      isTotalLine: true
    }
  ]
};
```

### 3.2 Statement of Financial Position (Balance Sheet)
```typescript
const balanceSheetTemplate = {
  statementCode: "ASSETS_LIAB",
  statementName: "Statement of Financial Position",
  columns: [
    { columnCode: "DESCRIPTION", columnName: "Description", dataType: "TEXT" },
    { columnCode: "NOTE", columnName: "Note", dataType: "NUMBER" },
    { columnCode: "CURRENT_FY", columnName: "FY 2025/2026 (FRW)", dataType: "CURRENCY" },
    { columnCode: "PRIOR_FY", columnName: "FY 2024/2025 (FRW)", dataType: "CURRENCY" }
  ],
  lines: [
    {
      lineCode: "CASH_EQUIVALENTS",
      lineItem: "Cash and cash equivalents",
      level: 2,
      eventMappings: ["CASH_EQUIVALENTS"],
      aggregationMethod: "SUM"
    },
    {
      lineCode: "TOTAL_ASSETS",
      lineItem: "Total assets (A)",
      level: 1,
      calculationFormula: "SUM(CURRENT_ASSETS, NON_CURRENT_ASSETS)",
      isTotalLine: true
    }
  ]
};
```

### 3.3 Statement of Cash Flows
```typescript
const cashFlowTemplate = {
  statementCode: "CASH_FLOW",
  statementName: "Statement of Cash Flows",
  columns: [
    { columnCode: "DESCRIPTION", columnName: "Description", dataType: "TEXT" },
    { columnCode: "NOTE", columnName: "Note", dataType: "NUMBER" },
    { columnCode: "CURRENT_FY", columnName: "FY 2025/2026 (FRW)", dataType: "CURRENCY" },
    { columnCode: "PRIOR_FY", columnName: "FY 2024/2025 (FRW)", dataType: "CURRENCY" }
  ],
  lines: [
    {
      lineCode: "NET_CASH_OPERATING",
      lineItem: "Net cash flows from operating activities",
      level: 1,
      calculationFormula: "SUM(OPERATING_REVENUES) - SUM(OPERATING_EXPENSES)",
      isTotalLine: true
    }
  ]
};
```

## 4. Implementation Strategy

### 4.1 Phase 1: Core Engine (Weeks 1-2)

#### Week 1: Foundation
- [ ] **Enhanced Statement Templates**: Extend current `statement_templates` table
- [ ] **Data Collection Service**: Build on existing `FinancialReportService`
- [ ] **Event Aggregation**: Leverage existing `configurable_event_mappings`
- [ ] **Basic Formula Engine**: Simple arithmetic operations

#### Week 2: Statement Generation
- [ ] **Statement Computation Engine**: Transform events to statement lines
- [ ] **Revenue & Expenditure Statement**: First working statement
- [ ] **API Integration**: Extend existing `/financial-reports/generate` endpoint
- [ ] **Validation Rules**: Basic accounting equation validation

### 4.2 Phase 2: Extended Functionality (Weeks 3-4)

#### Week 3: Multiple Statements
- [ ] **Balance Sheet Statement**: Assets and liabilities
- [ ] **Cash Flow Statement**: Operating, investing, financing activities
- [ ] **Cross-Statement Validation**: Ensure consistency across statements
- [ ] **Template Management**: CRUD operations for statement templates

#### Week 4: Advanced Features
- [ ] **Budget vs Actual**: Comparative analysis
- [ ] **Multi-Period Support**: Year-over-year comparisons
- [ ] **Export Functionality**: PDF, Excel, CSV formats
- [ ] **Performance Optimization**: Caching and query optimization

### 4.3 Phase 3: Advanced Features (Weeks 5-6)

#### Week 5: Dynamic Configuration
- [ ] **Statement Builder UI**: Visual statement configuration
- [ ] **Formula Editor**: Advanced formula creation
- [ ] **Template Versioning**: Track statement template changes
- [ ] **Conditional Display**: Show/hide lines based on conditions

#### Week 6: Integration & Testing
- [ ] **End-to-End Testing**: Complete statement generation workflows
- [ ] **Performance Testing**: Large dataset handling
- [ ] **User Acceptance Testing**: Real-world scenario testing
- [ ] **Documentation**: User guides and API documentation

## 5. API Design

### 5.1 Statement Generation API
```typescript
// Enhanced existing endpoint
POST /api/financial-reports/generate
{
  "templateType": "REV_EXP" | "ASSETS_LIAB" | "CASH_FLOW" | "BUDGET_VS_ACTUAL",
  "projectId": number,
  "facilityId": number,
  "reportingPeriodId": number,
  "fiscalYear": string,
  "includeComparatives": boolean,
  "generateFromPlanning": boolean,
  "generateFromExecution": boolean,
  "customMappings": Record<string, any>
}

// New statement-specific endpoints
GET /api/statements/templates
POST /api/statements/templates
PUT /api/statements/templates/{id}
DELETE /api/statements/templates/{id}

GET /api/statements/types
GET /api/statements/{id}/preview
POST /api/statements/{id}/validate
```

### 5.2 Statement Template Management
```typescript
// Template CRUD operations
interface StatementTemplateRequest {
  statementCode: string;
  statementName: string;
  columns: ColumnDefinition[];
  lines: LineDefinition[];
  validationRules: ValidationRule[];
}

// Template validation
interface TemplateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

## 6. Database Enhancements

### 6.1 Enhanced Statement Templates
```sql
-- Extend existing statement_templates table
ALTER TABLE statement_templates ADD COLUMN IF NOT EXISTS 
  columns jsonb DEFAULT '[]',
  validation_rules jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_statement_templates_code ON statement_templates(statement_code);
CREATE INDEX IF NOT EXISTS idx_statement_templates_active ON statement_templates(is_active);
```

### 6.2 Statement Generation Cache
```sql
-- Optional: Add caching table for performance
CREATE TABLE statement_generation_cache (
  id SERIAL PRIMARY KEY,
  statement_code VARCHAR(50) NOT NULL,
  project_id INTEGER NOT NULL,
  facility_id INTEGER NOT NULL,
  reporting_period_id INTEGER NOT NULL,
  fiscal_year VARCHAR(10) NOT NULL,
  generated_data jsonb NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
```

## 7. Integration Points

### 7.1 Existing System Integration
- **Financial Reports Service**: Extend `FinancialReportService.generateReport()`
- **Event Mappings**: Use existing `configurable_event_mappings` table
- **Form Data**: Leverage `schema_form_data_entries` for data collection
- **Validation**: Integrate with existing validation framework

### 7.2 New Components
- **Statement Template Service**: Manage statement definitions
- **Formula Engine**: Evaluate calculation formulas
- **Statement Generator**: Core statement generation logic
- **Export Service**: PDF, Excel, CSV generation

## 8. Error Handling & Validation

### 8.1 Data Validation
- **Missing Data**: Handle cases where expected activities/events are missing
- **Invalid Mappings**: Detect circular references in formulas
- **Type Mismatches**: Ensure data types match expected formats
- **Date Inconsistencies**: Validate reporting period boundaries

### 8.2 Statement Integrity Checks
- **Balance Validation**: Assets = Liabilities + Equity
- **Cash Flow Reconciliation**: Opening + Net Change = Closing
- **Cross-Statement Consistency**: Same events produce consistent values
- **Formula Validation**: Detect division by zero, undefined references

## 9. Performance Considerations

### 9.1 Optimization Strategies
- **Computation Caching**: Cache intermediate results
- **Lazy Loading**: Load statement templates on demand
- **Batch Processing**: Process multiple statements in parallel
- **Database Indexing**: Optimize queries for event aggregation

### 9.2 Scalability Factors
- **Memory Usage**: Monitor memory consumption for large datasets
- **Computation Complexity**: Optimize formula evaluation algorithms
- **Concurrent Access**: Handle multiple users generating statements
- **Data Volume**: Plan for growth in activities and reporting periods

## 10. Migration Strategy

### 10.1 Current State Analysis
Your existing system already has:
- ✅ Events table with proper structure
- ✅ Dynamic activities with flexible mapping
- ✅ Configurable event mappings
- ✅ Statement templates (needs enhancement)
- ✅ Form schemas for data collection
- ✅ Financial reports with validation

### 10.2 Required Enhancements
1. **Statement Templates**: Add column definitions and enhanced line configuration
2. **Formula Engine**: Implement calculation formula evaluation
3. **Statement Generator**: Core logic for transforming events to statement lines
4. **Template Management**: CRUD operations for statement templates

### 10.3 Rollout Plan
1. **Parallel Development**: Build engine alongside existing system
2. **Shadow Testing**: Run both old and new systems in parallel
3. **Gradual Migration**: Start with Revenue & Expenditure, expand gradually
4. **Fallback Strategy**: Maintain old system until new one is fully validated

## Conclusion

This blueprint leverages your existing robust architecture while adding the necessary components for dynamic financial statement generation. The phased approach ensures minimal disruption while providing powerful new capabilities.

**Key Advantages:**
- **Builds on Existing Foundation**: Leverages your current database schema and API structure
- **Incremental Implementation**: Can be developed and deployed in phases
- **Maintains Compatibility**: Works alongside existing financial reports system
- **Scalable Architecture**: Supports future statement types and requirements
- **Performance Optimized**: Designed for efficiency with large datasets

The implementation can start immediately with Phase 1, building on your existing `FinancialReportService` and database structure.
