```ts
import { relations } from "drizzle-orm/relations";
import { 
  // Enhanced core tables
  projects,
  enhancedUsers,
  
  // New schema-driven tables
  formSchemas,
  formFields,
  activityCategories,
  dynamicActivities,
  configurableEventMappings,
  validationRules,
  enhancedStatementTemplates,
  enhancedFinancialReports,
  formDataEntries,
  systemConfigurations,
  configurationAuditLog,
  
  // Existing tables (referenced)
  facilities,
  reportingPeriods,
  events,
  districts,
  provinces,
  account,
  session,
  verification
} from "./enhanced-tables";

// === CORE ENHANCED RELATIONS ===

export const projectsRelations = relations(projects, ({ one, many }) => ({
  // Original relations
  facility: one(facilities, {
    fields: [projects.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [projects.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  user: one(enhancedUsers, {
    fields: [projects.userId],
    references: [enhancedUsers.id]
  }),
  // New schema-driven relations
  formSchemas: many(formSchemas),
  activityCategories: many(activityCategories),
  financialReports: many(enhancedFinancialReports),
  formDataEntries: many(formDataEntries),
  eventMappings: many(configurableEventMappings),
}));

export const enhancedUsersRelations = relations(enhancedUsers, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [enhancedUsers.facilityId],
    references: [facilities.id]
  }),
  accounts: many(account),
  sessions: many(session),
  projects: many(projects),
  createdFormSchemas: many(formSchemas, { relationName: "form_schema_creator" }),
  createdReports: many(enhancedFinancialReports, { relationName: "report_creator" }),
  updatedReports: many(enhancedFinancialReports, { relationName: "report_updater" }),
  submittedReports: many(enhancedFinancialReports, { relationName: "report_submitter" }),
  approvedReports: many(enhancedFinancialReports, { relationName: "report_approver" }),
  formDataEntries: many(formDataEntries, { relationName: "form_data_creator" }),
  auditLogs: many(configurationAuditLog),
}));

// === SCHEMA-DRIVEN RELATIONS ===

export const formSchemasRelations = relations(formSchemas, ({ one, many }) => ({
  creator: one(enhancedUsers, {
    fields: [formSchemas.createdBy],
    references: [enhancedUsers.id],
    relationName: "form_schema_creator"
  }),
  formFields: many(formFields),
  formDataEntries: many(formDataEntries),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  schema: one(formSchemas, {
    fields: [formFields.schemaId],
    references: [formSchemas.id]
  }),
  parentField: one(formFields, {
    fields: [formFields.parentFieldId],
    references: [formFields.id],
    relationName: "field_hierarchy"
  }),
  childFields: many(formFields, {
    relationName: "field_hierarchy"
  }),
  category: one(activityCategories, {
    fields: [formFields.categoryId],
    references: [activityCategories.id]
  }),
}));

export const activityCategoriesRelations = relations(activityCategories, ({ one, many }) => ({
  project: one(projects, {
    fields: [activityCategories.projectId],
    references: [projects.id]
  }),
  parentCategory: one(activityCategories, {
    fields: [activityCategories.parentCategoryId],
    references: [activityCategories.id],
    relationName: "category_hierarchy"
  }),
  subCategories: many(activityCategories, {
    relationName: "category_hierarchy"
  }),
  activities: many(dynamicActivities),
  formFields: many(formFields),
  eventMappings: many(configurableEventMappings),
}));

export const dynamicActivitiesRelations = relations(dynamicActivities, ({ one, many }) => ({
  category: one(activityCategories, {
    fields: [dynamicActivities.categoryId],
    references: [activityCategories.id]
  }),
  eventMappings: many(configurableEventMappings),
}));

export const configurableEventMappingsRelations = relations(configurableEventMappings, ({ one }) => ({
  event: one(events, {
    fields: [configurableEventMappings.eventId],
    references: [events.id]
  }),
  activity: one(dynamicActivities, {
    fields: [configurableEventMappings.activityId],
    references: [dynamicActivities.id]
  }),
  category: one(activityCategories, {
    fields: [configurableEventMappings.categoryId],
    references: [activityCategories.id]
  }),
}));

export const enhancedStatementTemplatesRelations = relations(enhancedStatementTemplates, ({ one, many }) => ({
  parentLine: one(enhancedStatementTemplates, {
    fields: [enhancedStatementTemplates.parentLineId],
    references: [enhancedStatementTemplates.id],
    relationName: "statement_hierarchy"
  }),
  childLines: many(enhancedStatementTemplates, {
    relationName: "statement_hierarchy"
  }),
}));

export const enhancedFinancialReportsRelations = relations(enhancedFinancialReports, ({ one }) => ({
  project: one(projects, {
    fields: [enhancedFinancialReports.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [enhancedFinancialReports.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [enhancedFinancialReports.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(enhancedUsers, {
    fields: [enhancedFinancialReports.createdBy],
    references: [enhancedUsers.id],
    relationName: "report_creator"
  }),
  updater: one(enhancedUsers, {
    fields: [enhancedFinancialReports.updatedBy],
    references: [enhancedUsers.id],
    relationName: "report_updater"
  }),
  submitter: one(enhancedUsers, {
    fields: [enhancedFinancialReports.submittedBy],
    references: [enhancedUsers.id],
    relationName: "report_submitter"
  }),
  approver: one(enhancedUsers, {
    fields: [enhancedFinancialReports.approvedBy],
    references: [enhancedUsers.id],
    relationName: "report_approver"
  }),
}));

export const formDataEntriesRelations = relations(formDataEntries, ({ one }) => ({
  schema: one(formSchemas, {
    fields: [formDataEntries.schemaId],
    references: [formSchemas.id]
  }),
  project: one(projects, {
    fields: [formDataEntries.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [formDataEntries.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [formDataEntries.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(enhancedUsers, {
    fields: [formDataEntries.createdBy],
    references: [enhancedUsers.id],
    relationName: "form_data_creator"
  }),
  updater: one(enhancedUsers, {
    fields: [formDataEntries.updatedBy],
    references: [enhancedUsers.id]
  }),
}));

export const systemConfigurationsRelations = relations(systemConfigurations, ({ one }) => ({
  scopeProject: one(projects, {
    fields: [systemConfigurations.scopeId],
    references: [projects.id]
  }),
  scopeFacility: one(facilities, {
    fields: [systemConfigurations.scopeId],
    references: [facilities.id]
  }),
}));

export const configurationAuditLogRelations = relations(configurationAuditLog, ({ one }) => ({
  changedByUser: one(enhancedUsers, {
    fields: [configurationAuditLog.changedBy],
    references: [enhancedUsers.id]
  }),
}));

// === EXISTING TABLE RELATIONS (Updated) ===

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  district: one(districts, {
    fields: [facilities.districtId],
    references: [districts.id]
  }),
  // Original relations
  executionData: many(formDataEntries), // Updated to use new form data entries
  budgetAllocations: many(formDataEntries),
  planningData: many(formDataEntries),
  projects: many(projects),
  users: many(enhancedUsers),
  financialReports: many(enhancedFinancialReports),
}));

export const reportingPeriodsRelations = relations(reportingPeriods, ({ many }) => ({
  // Updated to use new form data entries and reports
  formDataEntries: many(formDataEntries),
  projects: many(projects),
  financialReports: many(enhancedFinancialReports),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  // Original relations remain
  eventMappings: many(configurableEventMappings),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id]
  }),
  facilities: many(facilities),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  districts: many(districts),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(enhancedUsers, {
    fields: [account.userId],
    references: [enhancedUsers.id]
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(enhancedUsers, {
    fields: [session.userId],
    references: [enhancedUsers.id]
  }),
}));
```