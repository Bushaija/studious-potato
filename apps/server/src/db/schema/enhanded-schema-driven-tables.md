```ts
import { pgTable, serial, varchar, integer, timestamp, boolean, text, numeric, jsonb, pgEnum, foreignKey, unique, check, index, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Enhanced Enums
export const facilityType = pgEnum("facility_type", ['hospital', 'health_center'])
export const projectType = pgEnum("project_type", ['HIV', 'Malaria', 'TB'])
export const userRole = pgEnum("user_role", ['accountant', 'admin', 'program_manager'])

// New Schema-Driven Enums
export const formFieldType = pgEnum("form_field_type", [
  'text', 'number', 'currency', 'percentage', 'date', 'select', 'multiselect', 
  'checkbox', 'textarea', 'calculated', 'readonly'
])
export const validationType = pgEnum("validation_type", [
  'required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom'
])
export const mappingType = pgEnum("mapping_type", ['DIRECT', 'COMPUTED', 'AGGREGATED'])
export const reportStatus = pgEnum("report_status", ['draft', 'submitted', 'approved', 'rejected'])
export const moduleType = pgEnum("module_type", ['planning', 'execution', 'reporting'])

// === ENHANCED CORE TABLES ===

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
}, (table) => [
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
    name: "enhanced_users_facility_id_fkey"
  }),
  unique("enhanced_users_email_key").on(table.email),
])

export const enhancedProjects = pgTable("enhanced_projects", {
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
}, (table) => [
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
    name: "enhanced_projects_facility_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.reportingPeriodId],
    foreignColumns: [reportingPeriods.id],
    name: "enhanced_projects_reporting_period_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [enhancedUsers.id],
    name: "enhanced_projects_user_id_fkey"
  }).onDelete("cascade"),
  unique("enhanced_projects_name_key").on(table.name),
  unique("enhanced_projects_code_key").on(table.code),
])

// === NEW SCHEMA-DRIVEN TABLES ===

export const formSchemas = pgTable("form_schemas", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  version: varchar({ length: 20 }).notNull(),
  projectType: projectType("project_type"),
  facilityType: facilityType("facility_type"),
  moduleType: moduleType("module_type").notNull(), // 'planning', 'execution', 'reporting'
  isActive: boolean("is_active").default(true),
  schema: jsonb("schema").notNull(), // Complete form schema definition
  metadata: jsonb("metadata"), // Additional schema metadata
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [enhancedUsers.id],
    name: "form_schemas_created_by_fkey"
  }),
])

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
}, (table) => [
  foreignKey({
    columns: [table.schemaId],
    foreignColumns: [formSchemas.id],
    name: "form_fields_schema_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.parentFieldId],
    foreignColumns: [table.id],
    name: "form_fields_parent_field_id_fkey"
  }),
])

export const schemaActivityCategories = pgTable("schema_activity_categories", {
  id: serial().primaryKey().notNull(),
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
}, (table) => [
  foreignKey({
    columns: [table.parentCategoryId],
    foreignColumns: [table.id],
    name: "schema_activity_categories_parent_fkey"
  }),
  unique("schema_categories_type_code").on(table.projectType, table.facilityType, table.code),
])

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
}, (table) => [
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [schemaActivityCategories.id],
    name: "dynamic_activities_category_id_fkey"
  }).onDelete("cascade"),
])

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
}, (table) => [
  foreignKey({
    columns: [table.eventId],
    foreignColumns: [events.id],
    name: "configurable_event_mappings_event_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.activityId],
    foreignColumns: [dynamicActivities.id],
    name: "configurable_event_mappings_activity_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [schemaActivityCategories.id],
    name: "configurable_event_mappings_category_id_fkey"
  }).onDelete("cascade"),
])

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
}, (table) => [
  foreignKey({
    columns: [table.parentLineId],
    foreignColumns: [table.id],
    name: "enhanced_statement_templates_parent_line_id_fkey"
  }).onDelete("set null"),
])

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
}, (table) => [
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [enhancedProjects.id],
    name: "enhanced_financial_reports_project_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
    name: "enhanced_financial_reports_facility_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.reportingPeriodId],
    foreignColumns: [reportingPeriods.id],
    name: "enhanced_financial_reports_reporting_period_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [enhancedUsers.id],
    name: "enhanced_financial_reports_created_by_fkey"
  }),
])

export const schemaFormDataEntries = pgTable("schema_form_data_entries", {
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
}, (table) => [
  foreignKey({
    columns: [table.schemaId],
    foreignColumns: [formSchemas.id],
    name: "schema_form_data_entries_schema_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [enhancedProjects.id],
    name: "schema_form_data_entries_project_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
    name: "schema_form_data_entries_facility_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [enhancedUsers.id],
    name: "schema_form_data_entries_created_by_fkey"
  }),
])

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
}, (table) => [
  foreignKey({
    columns: [table.changedBy],
    foreignColumns: [enhancedUsers.id],
    name: "configuration_audit_log_changed_by_fkey"
  }),
])

// === LEGACY TABLES (Referenced but not modified for backward compatibility) ===

export const provinces = pgTable("provinces", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
}, (table) => [
  unique("provinces_name_key").on(table.name),
])

export const districts = pgTable("districts", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  provinceId: integer("province_id").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.provinceId],
    foreignColumns: [provinces.id],
    name: "districts_province_id_fkey"
  }),
  unique("districts_name_key").on(table.name),
])

export const facilities = pgTable("facilities", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  facilityType: facilityType("facility_type").notNull(),
  districtId: integer("district_id").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.districtId],
    foreignColumns: [districts.id],
    name: "facilities_district_id_fkey"
  }),
  unique("facilities_name_district_id_key").on(table.name, table.districtId),
])

export const reportingPeriods = pgTable("reporting_periods", {
  id: serial().primaryKey().notNull(),
  year: integer().notNull(),
  periodType: varchar("period_type", { length: 20 }).default('ANNUAL'),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar({ length: 20 }).default('ACTIVE'),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  unique("reporting_periods_year_period_type_key").on(table.year, table.periodType),
])

export const events = pgTable("events", {
  id: serial().primaryKey().notNull(),
  noteNumber: integer("note_number").notNull(),
  code: varchar({ length: 50 }).notNull(),
  description: text().notNull(),
  statementCodes: text("statement_codes").array().notNull(),
  eventType: varchar("event_type", { length: 20 }).notNull(),
  isCurrent: boolean("is_current").default(true),
  displayOrder: integer("display_order").notNull(),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  unique("events_note_number_key").on(table.noteNumber),
  unique("events_code_key").on(table.code),
  check("events_event_type_check", sql`(event_type)::text = ANY (ARRAY[('REVENUE'::character varying)::text, ('EXPENSE'::character varying)::text, ('ASSET'::character varying)::text, ('LIABILITY'::character varying)::text, ('EQUITY'::character varying)::text])`),
])

// Authentication tables
export const account = pgTable("account", {
  id: serial().primaryKey().notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: integer("user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'date' }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'date' }),
  scope: text(),
  password: text(),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [enhancedUsers.id],
    name: "account_user_id_enhanced_users_id_fk"
  }).onDelete("cascade"),
])

export const session = pgTable("session", {
  id: serial().primaryKey().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
  token: text().notNull(),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: integer("user_id").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [enhancedUsers.id],
    name: "session_user_id_enhanced_users_id_fk"
  }).onDelete("cascade"),
  unique("session_token_unique").on(table.token),
])

export const verification = pgTable("verification", {
  id: serial().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date' }),
  updatedAt: timestamp("updated_at", { mode: 'date' }),
})
```