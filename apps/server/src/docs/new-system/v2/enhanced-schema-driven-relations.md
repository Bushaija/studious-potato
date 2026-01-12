```ts
import { relations } from "drizzle-orm/relations";
import { 
  // Enhanced core tables
  enhancedProjects,
  enhancedUsers,
  
  // New schema-driven tables
  formSchemas,
  formFields,
  schemaActivityCategories,
  dynamicActivities,
  configurableEventMappings,
  enhancedStatementTemplates,
  enhancedFinancialReports,
  schemaFormDataEntries,
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

// === ENHANCED CORE RELATIONS ===

export const enhancedProjectsRelations = relations(enhancedProjects, ({ one, many }) => ({
  // Original relations
  facility: one(facilities, {
    fields: [enhancedProjects.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [enhancedProjects.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  user: one(enhancedUsers, {
    fields: [enhancedProjects.userId],
    references: [enhancedUsers.id]
  }),
  // New schema-driven relations
  formSchemas: many(formSchemas),
  financialReports: many(enhancedFinancialReports),
  formDataEntries: many(schemaFormDataEntries),
  eventMappings: many(configurableEventMappings),
}));

export const enhancedUsersRelations = relations(enhancedUsers, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [enhancedUsers.facilityId],
    references: [facilities.id]
  }),
  accounts: many(account),
  sessions: many(session),
  projects: many(enhancedProjects),
  createdFormSchemas: many(formSchemas, { relationName: "form_schema_creator" }),
  createdReports: many(enhancedFinancialReports, { relationName: "report_creator" }),
  updatedReports: many(enhancedFinancialReports, { relationName: "report_updater" }),
  submittedReports: many(enhancedFinancialReports, { relationName: "report_submitter" }),
  approvedReports: many(enhancedFinancialReports, { relationName: "report_approver" }),
  formDataEntries: many(schemaFormDataEntries, { relationName: "form_data_creator" }),
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
  formDataEntries: many(schemaFormDataEntries),
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
  category: one(schemaActivityCategories, {
    fields: [formFields.categoryId],
    references: [schemaActivityCategories.id]
  }),
}));

export const schemaActivityCategoriesRelations = relations(schemaActivityCategories, ({ one, many }) => ({
  parentCategory: one(schemaActivityCategories, {
    fields: [schemaActivityCategories.parentCategoryId],
    references: [schemaActivityCategories.id],
    relationName: "category_hierarchy"
  }),
  subCategories: many(schemaActivityCategories, {
    relationName: "category_hierarchy"
  }),
  activities: many(dynamicActivities),
  formFields: many(formFields),
  eventMappings: many(configurableEventMappings),
}));

export const dynamicActivitiesRelations = relations(dynamicActivities, ({ one, many }) => ({
  category: one(schemaActivityCategories, {
    fields: [dynamicActivities.categoryId],
    references: [schemaActivityCategories.id]
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
  category: one(schemaActivityCategories, {
    fields: [configurableEventMappings.categoryId],
    references: [schemaActivityCategories.id]
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
  project: one(enhancedProjects, {
    fields: [enhancedFinancialReports.projectId],
    references: [enhancedProjects.id]
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

export const schemaFormDataEntriesRelations = relations(schemaFormDataEntries, ({ one }) => ({
  schema: one(formSchemas, {
    fields: [schemaFormDataEntries.schemaId],
    references: [formSchemas.id]
  }),
  project: one(enhancedProjects, {
    fields: [schemaFormDataEntries.projectId],
    references: [enhancedProjects.id]
  }),
  facility: one(facilities, {
    fields: [schemaFormDataEntries.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [schemaFormDataEntries.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(enhancedUsers, {
    fields: [schemaFormDataEntries.createdBy],
    references: [enhancedUsers.id],
    relationName: "form_data_creator"
  }),
  updater: one(enhancedUsers, {
    fields: [schemaFormDataEntries.updatedBy],
    references: [enhancedUsers.id]
  }),
}));

export const systemConfigurationsRelations = relations(systemConfigurations, ({ one }) => ({
  scopeProject: one(enhancedProjects, {
    fields: [systemConfigurations.scopeId],
    references: [enhancedProjects.id]
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
  // Updated to use new schema-driven tables
  formDataEntries: many(schemaFormDataEntries),
  projects: many(enhancedProjects),
  users: many(enhancedUsers),
  financialReports: many(enhancedFinancialReports),
}));

export const reportingPeriodsRelations = relations(reportingPeriods, ({ many }) => ({
  // Updated to use new schema-driven tables
  formDataEntries: many(schemaFormDataEntries),
  projects: many(enhancedProjects),
  financialReports: many(enhancedFinancialReports),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  // Updated to use configurable event mappings
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