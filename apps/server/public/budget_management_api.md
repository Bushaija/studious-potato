# Budget Management System - Comprehensive API Design

## API Architecture Overview

### Base URL Structure
```
https://api.budgetmanagement.gov.rw/v1
```

### Authentication
- JWT-based authentication with refresh tokens
- Role-based access control (accountant, admin, program_manager)
- Facility-scoped permissions

### Response Format Standards
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    version: string;
  };
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

## 1. AUTHENTICATION & USER MANAGEMENT

### Authentication Endpoints
```typescript
// POST /auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// POST /auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

// POST /auth/logout
// DELETE /auth/logout-all-sessions
```

### User Management
```typescript
// GET /users/profile
// PUT /users/profile
interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'accountant' | 'admin' | 'program_manager';
  facility: {
    id: number;
    name: string;
    type: 'hospital' | 'health_center';
    district: string;
  };
  permissions: string[];
  projectAccess: number[];
  configAccess: string[];
  isActive: boolean;
  lastLoginAt: string;
}

// GET /users (admin only)
// POST /users (admin only)
// PUT /users/{id} (admin only)
// DELETE /users/{id} (admin only)
```

## 2. SCHEMA-DRIVEN FORM ENGINE

### Form Schema Management
```typescript
// GET /schemas
interface FormSchemaListResponse {
  schemas: FormSchemaDTO[];
  pagination: PaginationMeta;
}

// GET /schemas/{id}
interface FormSchemaDTO {
  id: number;
  name: string;
  version: string;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  moduleType: 'planning' | 'execution' | 'reporting';
  isActive: boolean;
  schema: FormDefinition;
  metadata: Record<string, any>;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface FormDefinition {
  title: string;
  description?: string;
  sections: FormSection[];
  validation: ValidationRule[];
  calculations: CalculationRule[];
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  displayOrder: number;
  conditions?: DisplayCondition[];
}

interface FormField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'calculated' | 'readonly';
  isRequired: boolean;
  displayOrder: number;
  parentFieldId?: string;
  categoryId?: number;
  config: FieldConfig;
  validation: ValidationRule[];
  defaultValue?: any;
  helpText?: string;
  isVisible: boolean;
  isEditable: boolean;
}

interface FieldConfig {
  options?: SelectOption[]; // for select/multiselect
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  format?: string; // for currency, percentage
  precision?: number; // for numeric fields
  formula?: string; // for calculated fields
}

interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  formula?: string; // for custom validation
}

interface CalculationRule {
  fieldId: string;
  formula: string;
  dependencies: string[];
}

// POST /schemas
// PUT /schemas/{id}
// DELETE /schemas/{id}
```

### Dynamic Form Rendering
```typescript
// GET /schemas/{id}/render
interface RenderedForm {
  schema: FormSchemaDTO;
  renderedFields: RenderedField[];
  computedValues: Record<string, any>;
  validationState: Record<string, ValidationResult>;
}

interface RenderedField extends FormField {
  computedValue?: any;
  validationErrors: ValidationError[];
  dependencies: string[];
  affectedFields: string[];
}

// POST /schemas/validate-data
interface ValidateFormDataRequest {
  schemaId: number;
  data: Record<string, any>;
}

interface ValidateFormDataResponse {
  isValid: boolean;
  errors: ValidationError[];
  computedValues: Record<string, any>;
}
```

## 3. DYNAMIC ACTIVITIES & CATEGORIES

### Activity Categories Management
```typescript
// GET /categories
interface CategoryListRequest {
  projectType?: 'HIV' | 'Malaria' | 'TB';
  facilityType?: 'hospital' | 'health_center';
  parentCategoryId?: number;
  isActive?: boolean;
}

interface ActivityCategoryDTO {
  id: number;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  parentCategoryId?: number;
  isComputed: boolean;
  computationFormula?: string;
  metadata: Record<string, any>;
  isActive: boolean;
  children?: ActivityCategoryDTO[];
  activities?: DynamicActivityDTO[];
}

// GET /categories/{id}
// POST /categories
// PUT /categories/{id}
// DELETE /categories/{id}
// POST /categories/reorder
```

### Dynamic Activities Management
```typescript
// GET /activities
interface ActivityListRequest {
  categoryId?: number;
  projectType?: 'HIV' | 'Malaria' | 'TB';
  facilityType?: 'hospital' | 'health_center';
  isActive?: boolean;
}

interface DynamicActivityDTO {
  id: number;
  categoryId: number;
  category: ActivityCategoryDTO;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  code?: string;
  name: string;
  description?: string;
  activityType: string; // "HC Nurses (A1) Salary", etc.
  displayOrder: number;
  isTotalRow: boolean;
  isAnnualOnly: boolean;
  fieldMappings: Record<string, any>;
  computationRules: Record<string, any>;
  validationRules: Record<string, any>;
  metadata: Record<string, any>;
  isActive: boolean;
}

// GET /activities/{id}
// POST /activities
// PUT /activities/{id}
// DELETE /activities/{id}
// POST /activities/bulk-create
// POST /activities/reorder
```

## 4. CONFIGURABLE EVENT MAPPINGS

### Event-Activity Mapping Management
```typescript
// GET /event-mappings
interface EventMappingListRequest {
  eventId?: number;
  activityId?: number;
  categoryId?: number;
  projectType?: 'HIV' | 'Malaria' | 'TB';
  facilityType?: 'hospital' | 'health_center';
  isActive?: boolean;
}

interface EventMappingDTO {
  id: number;
  event: EventDTO;
  activity?: DynamicActivityDTO;
  category?: ActivityCategoryDTO;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  mappingType: 'DIRECT' | 'COMPUTED' | 'AGGREGATED';
  mappingFormula?: string;
  mappingRatio: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata: Record<string, any>;
}

interface EventDTO {
  id: number;
  noteNumber: number;
  code: string;
  description: string;
  statementCodes: string[];
  eventType: 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
  isCurrent: boolean;
  displayOrder: number;
}

// GET /event-mappings/{id}
// POST /event-mappings
// PUT /event-mappings/{id}
// DELETE /event-mappings/{id}
// POST /event-mappings/bulk-update
```

### Events Management
```typescript
// GET /events
// GET /events/{id}
// POST /events
// PUT /events/{id}
// DELETE /events/{id}
```

## 5. PLANNING MODULE (Schema-Driven)

### Planning Data Management
```typescript
// GET /planning
interface PlanningListRequest {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  categoryId?: number;
  year?: number;
}

interface PlanningDataDTO {
  id: number;
  schemaId: number;
  schema: FormSchemaDTO;
  projectId: number;
  project: ProjectDTO;
  facilityId: number;
  facility: FacilityDTO;
  reportingPeriodId?: number;
  reportingPeriod?: ReportingPeriodDTO;
  formData: Record<string, any>; // Dynamic form data
  computedValues: Record<string, any>; // Auto-calculated values
  validationState: Record<string, ValidationResult>;
  metadata: Record<string, any>;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
}

// GET /planning/{id}
// POST /planning
// PUT /planning/{id}
// DELETE /planning/{id}

// POST /planning/validate
// POST /planning/calculate
// GET /planning/summary
```

### Planning Calculations
```typescript
// POST /planning/calculate-totals
interface CalculatePlanningTotalsRequest {
  planningId: number;
  data: Record<string, any>;
}

interface CalculatePlanningTotalsResponse {
  quarterlyTotals: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  annualTotal: number;
  categoryTotals: Record<string, number>;
  computedValues: Record<string, any>;
}

// GET /planning/templates/{projectType}/{facilityType}
```

## 6. EXECUTION MODULE (Schema-Driven)

### Execution Data Management
```typescript
// GET /execution
interface ExecutionListRequest {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year?: number;
}

interface ExecutionDataDTO {
  id: number;
  schemaId: number;
  schema: FormSchemaDTO;
  projectId: number;
  project: ProjectDTO;
  facilityId: number;
  facility: FacilityDTO;
  reportingPeriodId?: number;
  reportingPeriod?: ReportingPeriodDTO;
  formData: Record<string, any>; // Dynamic form data
  computedValues: Record<string, any>; // Auto-calculated balances, etc.
  validationState: Record<string, ValidationResult>;
  metadata: Record<string, any>;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
}

// GET /execution/{id}
// POST /execution
// PUT /execution/{id}
// DELETE /execution/{id}

// POST /execution/validate-accounting-equation
// POST /execution/calculate-balances
// GET /execution/quarterly-summary
```

### Balance Calculations
```typescript
// POST /execution/calculate-balances
interface CalculateBalancesRequest {
  executionId: number;
  data: Record<string, any>;
}

interface CalculateBalancesResponse {
  receipts: QuarterlyValues;
  expenditures: QuarterlyValues;
  surplus: QuarterlyValues; // A - B
  financialAssets: QuarterlyValues;
  financialLiabilities: QuarterlyValues;
  netFinancialAssets: QuarterlyValues; // D - E
  closingBalance: QuarterlyValues;
  isBalanced: boolean; // F = G validation
  validationErrors: ValidationError[];
}

interface QuarterlyValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  cumulativeBalance: number;
}
```

## 7. FINANCIAL STATEMENTS & REPORTING

### Statement Templates Management
```typescript
// GET /statement-templates
interface StatementTemplateListRequest {
  statementCode?: string;
  isActive?: boolean;
}

interface StatementTemplateDTO {
  id: number;
  statementCode: string;
  statementName: string;
  lineItem: string;
  lineCode?: string;
  parentLineId?: number;
  displayOrder: number;
  level: number;
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  eventMappings: Record<string, any>;
  calculationFormula?: string;
  aggregationMethod: string;
  displayConditions: Record<string, any>;
  formatRules: Record<string, any>;
  metadata: Record<string, any>;
  isActive: boolean;
  children?: StatementTemplateDTO[];
}

// GET /statement-templates/{id}
// POST /statement-templates
// PUT /statement-templates/{id}
// DELETE /statement-templates/{id}
```

### Financial Reports Management
```typescript
// GET /financial-reports
interface FinancialReportListRequest {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  fiscalYear?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  reportType?: string;
}

interface FinancialReportDTO {
  id: number;
  reportCode: string;
  title: string;
  projectId: number;
  project: ProjectDTO;
  facilityId: number;
  facility: FacilityDTO;
  reportingPeriodId: number;
  reportingPeriod: ReportingPeriodDTO;
  version: string;
  fiscalYear: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  reportData: Record<string, any>;
  metadata: ReportMetadata;
  computedTotals: Record<string, any>;
  validationResults: Record<string, ValidationResult>;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
  submittedBy?: number;
  submittedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
}

interface ReportMetadata {
  facility: FacilityDTO;
  project?: ProjectDTO;
  submitter?: UserProfile;
  approver?: UserProfile;
  comments?: string;
  attachments?: string[];
}

// GET /financial-reports/{id}
// POST /financial-reports
// PUT /financial-reports/{id}
// DELETE /financial-reports/{id}
```

### Report Generation
```typescript
// POST /financial-reports/generate
interface GenerateReportRequest {
  templateType: 'revenue_expenditure' | 'balance_sheet' | 'cash_flow' | 'budget_vs_actual' | 'net_assets_changes';
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  fiscalYear: string;
  includeComparatives?: boolean;
  customMappings?: Record<string, any>;
}

// POST /financial-reports/{id}/submit
// POST /financial-reports/{id}/approve
// POST /financial-reports/{id}/reject
interface ReportActionRequest {
  comments?: string;
  attachments?: string[];
}

// GET /financial-reports/{id}/export/{format}
// Supported formats: pdf, excel, csv
```

### Statement-Specific Endpoints
```typescript
// GET /statements/revenue-expenditure/{reportId}
// GET /statements/balance-sheet/{reportId}
// GET /statements/cash-flow/{reportId}
// GET /statements/budget-vs-actual/{reportId}
// GET /statements/net-assets-changes/{reportId}

interface StatementResponse {
  statement: StatementData;
  metadata: ReportMetadata;
  totals: Record<string, number>;
  comparatives?: Record<string, number>;
}
```

## 8. SYSTEM CONFIGURATION

### Configuration Management
```typescript
// GET /configurations
interface ConfigurationListRequest {
  configType?: string;
  scope?: 'GLOBAL' | 'PROJECT' | 'FACILITY';
  scopeId?: number;
  isActive?: boolean;
}

interface SystemConfigurationDTO {
  id: number;
  configKey: string;
  configValue: Record<string, any>;
  description?: string;
  configType: string;
  scope: 'GLOBAL' | 'PROJECT' | 'FACILITY';
  scopeId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /configurations/{key}
// POST /configurations
// PUT /configurations/{key}
// DELETE /configurations/{key}
```

### Audit & Change Tracking
```typescript
// GET /audit-logs
interface AuditLogListRequest {
  tableName?: string;
  recordId?: number;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE';
  changedBy?: number;
  fromDate?: string;
  toDate?: string;
}

interface AuditLogDTO {
  id: number;
  tableName: string;
  recordId: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedBy: number;
  changedByUser: UserProfile;
  changeReason?: string;
  changedAt: string;
}

// GET /audit-logs/{id}
```

## 9. REFERENCE DATA MANAGEMENT

### Projects & Facilities
```typescript
// GET /projects
interface ProjectDTO {
  id: number;
  name: string;
  status: string;
  code: string;
  description?: string;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityId: number;
  facility: FacilityDTO;
  reportingPeriodId?: number;
  reportingPeriod?: ReportingPeriodDTO;
  userId: number;
  user: UserProfile;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// GET /projects/{id}
// POST /projects
// PUT /projects/{id}
// DELETE /projects/{id}

// GET /facilities
interface FacilityDTO {
  id: number;
  name: string;
  facilityType: 'hospital' | 'health_center';
  districtId: number;
  district: DistrictDTO;
}

// GET /facilities/{id}
// POST /facilities
// PUT /facilities/{id}
// DELETE /facilities/{id}
```

### Geographic Data
```typescript
// GET /provinces
interface ProvinceDTO {
  id: number;
  name: string;
  districts: DistrictDTO[];
}

// GET /districts
interface DistrictDTO {
  id: number;
  name: string;
  provinceId: number;
  province: ProvinceDTO;
  facilities: FacilityDTO[];
}

// GET /reporting-periods
interface ReportingPeriodDTO {
  id: number;
  year: number;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

## 10. VALIDATION & COMPUTATION ENGINE

### Validation Services
```typescript
// POST /validation/form-data
interface ValidateFormDataRequest {
  schemaId: number;
  data: Record<string, any>;
  context?: {
    projectType: string;
    facilityType: string;
    reportingPeriod?: string;
  };
}

interface ValidationResult {
  fieldId: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// POST /validation/financial-balances
interface ValidateFinancialBalancesRequest {
  data: Record<string, any>;
  rules: string[]; // Array of validation rule names
}

// POST /validation/accounting-equation
// Validates F = G (Net Financial Assets = Closing Balance)
```

### Computation Services
```typescript
// POST /computation/calculate-values
interface CalculateValuesRequest {
  schemaId: number;
  data: Record<string, any>;
  calculations: CalculationRule[];
}

interface CalculateValuesResponse {
  computedValues: Record<string, any>;
  calculationTrace: CalculationStep[];
  errors: ComputationError[];
}

interface CalculationStep {
  fieldId: string;
  formula: string;
  inputs: Record<string, any>;
  result: any;
  executionTime: number;
}

// POST /computation/aggregate-totals
// POST /computation/variance-analysis
```

## 11. BULK OPERATIONS & DATA MIGRATION

### Bulk Data Operations
```typescript
// POST /bulk/import-activities
interface BulkImportActivitiesRequest {
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  activities: Omit<DynamicActivityDTO, 'id' | 'createdAt' | 'updatedAt'>[];
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    validateBeforeImport: boolean;
  };
}

// POST /bulk/migrate-legacy-data
// POST /bulk/export-data
// POST /bulk/backup-configurations
```

### Data Migration Support
```typescript
// POST /migration/normalize-legacy-reports
interface NormalizeLegacyReportsRequest {
  legacyData: Record<string, any>;
  targetSchemaId: number;
  mappingRules?: Record<string, any>;
}

// POST /migration/validate-migration
// GET /migration/status/{migrationId}
```

## 12. ANALYTICS & DASHBOARDS

### Dashboard Data
```typescript
// GET /dashboard/summary
interface DashboardSummaryResponse {
  facilities: {
    total: number;
    byType: Record<string, number>;
    byDistrict: Record<string, number>;
  };
  projects: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  reports: {
    total: number;
    byStatus: Record<string, number>;
    pendingApproval: number;
    recentlySubmitted: FinancialReportDTO[];
  };
  alerts: Alert[];
}

// GET /analytics/budget-execution-rates
// GET /analytics/variance-trends
// GET /analytics/compliance-status
```

## Error Handling & Status Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (business logic errors)
- `500` - Internal Server Error

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  errors?: ValidationError[];
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

## Rate Limiting & Performance

### Rate Limiting
- Authentication endpoints: 5 requests per minute
- CRUD operations: 100 requests per minute per user
- Bulk operations: 10 requests per hour per user
- Report generation: 20 requests per hour per user

### Caching Strategy
- Form schemas cached for 1 hour
- Reference data (facilities, districts) cached for 24 hours
- User permissions cached for 30 minutes
- Statement templates cached for 2 hours

This comprehensive API design provides a robust foundation for transitioning from hard-coded forms to a fully schema-driven Budget Management System, enabling flexibility, scalability, and maintainability while preserving data integrity and user experience.