```ts

import { pgTable, serial, varchar, integer, timestamp, boolean, text, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Enums
export const facilityType = pgEnum("facility_type", ['hospital', 'health_center'])
export const projectType = pgEnum("project_type", ['HIV', 'Malaria', 'TB'])
export const userRole = pgEnum("user_role", ['accountant', 'admin', 'program_manager'])
export const formFieldType = pgEnum("form_field_type", [
  'text', 'number', 'currency', 'percentage', 'date', 'select', 'multiselect', 
  'checkbox', 'textarea', 'calculated', 'readonly'
])
export const validationType = pgEnum("validation_type", [
  'required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom'
])
export const mappingType = pgEnum("mapping_type", ['DIRECT', 'COMPUTED', 'AGGREGATED'])
export const reportStatus = pgEnum("report_status", ['draft', 'submitted', 'approved', 'rejected'])

// === CORE EXISTING TABLES (Enhanced) ===

export const projects = pgTable("projects", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 200 }).notNull(),
  status: varchar({ length: 20 }).default('ACTIVE'),
  code: varchar({ length: 10 }).notNull(),
  description: text(),
  projectType: projectType("project_type"),
  facilityId: integer("facility_id"),
  reportingPeriodId: integer("reporting_period_id"),
  userId: integer("user_id"),
  // Enhanced metadata for schema-driven system
  metadata: jsonb("metadata"), // Store project-specific configurations
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// === NEW SCHEMA-DRIVEN TABLES ===

// Form Schema Management
export const formSchemas = pgTable("form_schemas", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  version: varchar({ length: 20 }).notNull(),
  projectType: projectType("project_type"),
  facilityType: facilityType("facility_type"),
  moduleType: varchar("module_type", { length: 50 }).notNull(), // 'planning', 'execution', 'reporting'
  isActive: boolean("is_active").default(true),
  schema: jsonb("schema").notNull(), // Complete form schema definition
  metadata: jsonb("metadata"), // Additional schema metadata
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Form Fields (Detailed field definitions)
export const formFields = pgTable("form_fields", {
  id: serial().primaryKey().notNull(),
  schemaId: integer("schema_id").notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  label: varchar({ length: 200 }).notNull(),
  fieldType: formFieldType("field_type").notNull(),
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").notNull(),
  parentFieldId: integer("parent_field_id"), // For nested/grouped fields
  categoryId: integer("category_id"), // Link to activity categories
  // Field configuration
  fieldConfig: jsonb("field_config"), // Type-specific configuration
  validationRules: jsonb("validation_rules"), // Validation rules
  computationFormula: text("computation_formula"), // For calculated fields
  defaultValue: jsonb("default_value"),
  helpText: text("help_text"),
  isVisible: boolean("is_visible").default(true),
  isEditable: boolean("is_editable").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Enhanced Activity Categories (Schema-driven)
export const activityCategories = pgTable("activity_categories", {
  id: serial().primaryKey().notNull(),
  projectId: integer("project_id"),
  projectType: projectType("project_type"),
  facilityType: facilityType("facility_type"),
  code: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  displayOrder: integer("display_order").notNull(),
  parentCategoryId: integer("parent_category_id"), // For hierarchical categories
  isComputed: boolean("is_computed").default(false),
  computationFormula: text("computation_formula"),
  metadata: jsonb("metadata"), // Category-specific configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Dynamic Activities (Schema-driven)
export const dynamicActivities = pgTable("dynamic_activities", {
  id: serial().primaryKey().notNull(),
  categoryId: integer("category_id").notNull(),
  projectType: projectType("project_type"),
  facilityType: facilityType("facility_type"),
  code: varchar({ length: 100 }),
  name: varchar({ length: 300 }).notNull(),
  description: text(),
  activityType: varchar("activity_type", { length: 100 }), // "HC Nurses (A1) Salary", etc.
  displayOrder: integer("display_order").notNull(),
  isTotalRow: boolean("is_total_row").default(false),
  isAnnualOnly: boolean("is_annual_only").default(false),
  // Activity configuration
  fieldMappings: jsonb("field_mappings"), // Maps to form fields
  computationRules: jsonb("computation_rules"), // How values are calculated
  validationRules: jsonb("validation_rules"), // Activity-specific validation
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Enhanced Event-Activity Mapping (Configurable)
export const configurableEventMappings = pgTable("configurable_event_mappings", {
  id: serial().primaryKey().notNull(),
  eventId: integer("event_id").notNull(),
  activityId: integer("activity_id"),
  categoryId: integer("category_id"),
  projectType: projectType("project_type"),
  facilityType: facilityType("facility_type"),
  mappingType: mappingType("mapping_type").default('DIRECT'),
  mappingFormula: text("mapping_formula"), // For computed mappings
  mappingRatio: numeric("mapping_ratio", { precision: 10, scale: 4 }).default('1.0000'),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from", { mode: 'date' }),
  effectiveTo: timestamp("effective_to", { mode: 'date' }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Validation Rules Repository
export const validationRules = pgTable("validation_rules", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  ruleType: validationType("rule_type").notNull(),
  ruleConfig: jsonb("rule_config").notNull(), // Rule parameters
  errorMessage: text("error_message").notNull(),
  isGlobal: boolean("is_global").default(false), // Can be reused across forms
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Statement Templates (Enhanced for flexibility)
export const enhancedStatementTemplates = pgTable("enhanced_statement_templates", {
  id: serial().primaryKey().notNull(),
  statementCode: varchar("statement_code", { length: 50 }).notNull(),
  statementName: varchar("statement_name", { length: 200 }).notNull(),
  lineItem: varchar("line_item", { length: 300 }).notNull(),
  lineCode: varchar("line_code", { length: 50 }),
  parentLineId: integer("parent_line_id"),
  displayOrder: integer("display_order").notNull(),
  level: integer("level").default(1),
  isTotalLine: boolean("is_total_line").default(false),
  isSubtotalLine: boolean("is_subtotal_line").default(false),
  // Enhanced mapping configuration
  eventMappings: jsonb("event_mappings"), // Array of event IDs or mapping rules
  calculationFormula: text("calculation_formula"),
  aggregationMethod: varchar("aggregation_method", { length: 50 }).default('SUM'),
  // Conditional display
  displayConditions: jsonb("display_conditions"), // When to show this line
  formatRules: jsonb("format_rules"), // How to format values
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Enhanced Financial Reports
export const enhancedFinancialReports = pgTable("enhanced_financial_reports", {
  id: serial().primaryKey().notNull(),
  reportCode: varchar("report_code", { length: 50 }).notNull(),
  title: varchar({ length: 300 }).notNull(),
  projectId: integer("project_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  reportingPeriodId: integer("reporting_period_id").notNull(),
  version: varchar({ length: 20 }).default('1.0'),
  fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
  status: reportStatus("status").default('draft'),
  // Report data and structure
  reportData: jsonb("report_data").notNull(), // Complete report data
  metadata: jsonb("metadata"), // Report metadata (submitter, approver, etc.)
  computedTotals: jsonb("computed_totals"), // Auto-calculated totals
  validationResults: jsonb("validation_results"), // Validation status
  // Audit trail
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  submittedBy: integer("submitted_by"),
  submittedAt: timestamp("submitted_at", { mode: 'date' }),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'date' }),
})

// Form Data Storage (Schema-agnostic)
export const formDataEntries = pgTable("form_data_entries", {
  id: serial().primaryKey().notNull(),
  schemaId: integer("schema_id").notNull(),
  entityId: integer("entity_id"), // Planning data, execution data, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'planning', 'execution'
  projectId: integer("project_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  reportingPeriodId: integer("reporting_period_id"),
  // Dynamic data storage
  formData: jsonb("form_data").notNull(), // All form field values
  computedValues: jsonb("computed_values"), // Auto-calculated values
  validationState: jsonb("validation_state"), // Validation results
  metadata: jsonb("metadata"),
  // Audit fields
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Configuration Management
export const systemConfigurations = pgTable("system_configurations", {
  id: serial().primaryKey().notNull(),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  configValue: jsonb("config_value").notNull(),
  description: text("description"),
  configType: varchar("config_type", { length: 50 }).notNull(), // 'form', 'mapping', 'validation', etc.
  scope: varchar({ length: 50 }).default('GLOBAL'), // 'GLOBAL', 'PROJECT', 'FACILITY'
  scopeId: integer("scope_id"), // Project or facility ID if scoped
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Audit Log for Configuration Changes
export const configurationAuditLog = pgTable("configuration_audit_log", {
  id: serial().primaryKey().notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  operation: varchar({ length: 20 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedBy: integer("changed_by").notNull(),
  changeReason: text("change_reason"),
  changedAt: timestamp("changed_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
})

// Enhanced Users table
export const enhancedUsers = pgTable("enhanced_users", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean("email_verified").notNull(),
  role: userRole().default('accountant').notNull(),
  facilityId: integer("facility_id"),
  // Enhanced user capabilities
  permissions: jsonb("permissions"), // Granular permissions
  projectAccess: jsonb("project_access"), // Which projects user can access
  configAccess: jsonb("config_access"), // Configuration management permissions
  lastLoginAt: timestamp("last_login_at", { mode: 'date' }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).notNull(),
})

```