import { relations } from "drizzle-orm/relations";
import {
  // Enhanced core tables
  projects,
  users,

  // New schema-driven tables
  formSchemas,
  formFields,
  schemaActivityCategories,
  dynamicActivities,
  configurableEventMappings,
  statementTemplates,
  financialReports,
  financialReportWorkflowLogs,
  schemaFormDataEntries,
  systemConfigurations,
  configurationAuditLog,
  approvalAuditLog,
  
  // Snapshot and period locking tables
  reportVersions,
  periodLocks,
  periodLockAuditLog,
  
  // Documents table
  documents,

  // Existing tables (referenced)
  facilities,
  reportingPeriods,
  events,
  districts,
  provinces,
  account,
  session,
} from "../schema";

// === ENHANCED CORE RELATIONS ===

export const projectsRelations = relations(projects, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [projects.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [projects.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  user: one(users, {
    fields: [projects.userId],
    references: [users.id]
  }),
  formSchemas: many(formSchemas),
  financialReports: many(financialReports),
  formDataEntries: many(schemaFormDataEntries),
  eventMappings: many(configurableEventMappings),
  documents: many(documents, { relationName: "project_documents" }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id]
  }),
  accounts: many(account),
  sessions: many(session),
  projects: many(projects),
  createdFormSchemas: many(formSchemas, { relationName: "form_schema_creator" }),
  createdReports: many(financialReports, { relationName: "report_creator" }),
  updatedReports: many(financialReports, { relationName: "report_updater" }),
  submittedReports: many(financialReports, { relationName: "report_submitter" }),
  approvedReports: many(financialReports, { relationName: "report_approver" }),
  dafApprovedReports: many(financialReports, { relationName: "report_daf_approver" }),
  dgApprovedReports: many(financialReports, { relationName: "report_dg_approver" }),
  workflowActions: many(financialReportWorkflowLogs, { relationName: "workflow_actor" }),
  formDataEntries: many(schemaFormDataEntries, { relationName: "form_data_creator" }),
  auditLogs: many(configurationAuditLog),
  approvalActions: many(approvalAuditLog, { relationName: "approval_action_by" }),
  reviewedPlans: many(schemaFormDataEntries, { relationName: "plan_reviewer" }),
  createdVersions: many(reportVersions, { relationName: "version_creator" }),
  lockedPeriods: many(periodLocks, { relationName: "period_lock_locker" }),
  unlockedPeriods: many(periodLocks, { relationName: "period_lock_unlocker" }),
  periodLockAudits: many(periodLockAuditLog, { relationName: "audit_performer" }),
  uploadedDocuments: many(documents, { relationName: "document_uploader" }),
  verifiedDocuments: many(documents, { relationName: "document_verifier" }),
  updatedDocuments: many(documents, { relationName: "document_updater" }),
  deletedDocuments: many(documents, { relationName: "document_deleter" }),
}));

// === SCHEMA-DRIVEN RELATIONS ===

export const formSchemasRelations = relations(formSchemas, ({ one, many }) => ({
  creator: one(users, {
    fields: [formSchemas.createdBy],
    references: [users.id],
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

export const statementTemplatesRelations = relations(statementTemplates, ({ one, many }) => ({
  parentLine: one(statementTemplates, {
    fields: [statementTemplates.parentLineId],
    references: [statementTemplates.id],
    relationName: "statement_hierarchy"
  }),
  childLines: many(statementTemplates, {
    relationName: "statement_hierarchy"
  }),
}));

export const financialReportsRelations = relations(financialReports, ({ one, many }) => ({
  project: one(projects, {
    fields: [financialReports.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [financialReports.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [financialReports.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(users, {
    fields: [financialReports.createdBy],
    references: [users.id],
    relationName: "report_creator"
  }),
  updater: one(users, {
    fields: [financialReports.updatedBy],
    references: [users.id],
    relationName: "report_updater"
  }),
  submitter: one(users, {
    fields: [financialReports.submittedBy],
    references: [users.id],
    relationName: "report_submitter"
  }),
  approver: one(users, {
    fields: [financialReports.approvedBy],
    references: [users.id],
    relationName: "report_approver"
  }),
  dafApprover: one(users, {
    fields: [financialReports.dafId],
    references: [users.id],
    relationName: "report_daf_approver"
  }),
  dgApprover: one(users, {
    fields: [financialReports.dgId],
    references: [users.id],
    relationName: "report_dg_approver"
  }),
  workflowLogs: many(financialReportWorkflowLogs, { relationName: "report_workflow_history" }),
  versions: many(reportVersions, { relationName: "report_versions" }),
  documents: many(documents, { relationName: "financial_report_documents" }),
}));

export const schemaFormDataEntriesRelations = relations(schemaFormDataEntries, ({ one, many }) => ({
  schema: one(formSchemas, {
    fields: [schemaFormDataEntries.schemaId],
    references: [formSchemas.id]
  }),
  project: one(projects, {
    fields: [schemaFormDataEntries.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [schemaFormDataEntries.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [schemaFormDataEntries.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(users, {
    fields: [schemaFormDataEntries.createdBy],
    references: [users.id],
    relationName: "form_data_creator"
  }),
  updater: one(users, {
    fields: [schemaFormDataEntries.updatedBy],
    references: [users.id]
  }),
  reviewer: one(users, {
    fields: [schemaFormDataEntries.reviewedBy],
    references: [users.id],
    relationName: "plan_reviewer"
  }),
  approvalHistory: many(approvalAuditLog, { relationName: "plan_approval_history" }),
  documents: many(documents, { relationName: "data_entry_documents" }),
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
  changedByUser: one(users, {
    fields: [configurationAuditLog.changedBy],
    references: [users.id]
  }),
}));

// === EXISTING TABLE RELATIONS (Updated) ===

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  district: one(districts, {
    fields: [facilities.districtId],
    references: [districts.id]
  }),
  parentFacility: one(facilities, {
    fields: [facilities.parentFacilityId],
    references: [facilities.id],
    relationName: "facility_hierarchy",
  }),
  childFacilities: many(facilities, {
    relationName: "facility_hierarchy",
  }),
  formDataEntries: many(schemaFormDataEntries),
  projects: many(projects),
  users: many(users),
  financialReports: many(financialReports),
  documents: many(documents, { relationName: "facility_documents" }),
}));

export const reportingPeriodsRelations = relations(reportingPeriods, ({ many }) => ({
  // Updated to use new schema-driven tables
  formDataEntries: many(schemaFormDataEntries),
  projects: many(projects),
  financialReports: many(financialReports),
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
  user: one(users, {
    fields: [account.userId],
    references: [users.id]
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id]
  }),
}));

export const approvalAuditLogRelations = relations(approvalAuditLog, ({ one }) => ({
  plan: one(schemaFormDataEntries, {
    fields: [approvalAuditLog.planningId],
    references: [schemaFormDataEntries.id],
    relationName: "plan_approval_history"
  }),
  actionByUser: one(users, {
    fields: [approvalAuditLog.actionBy],
    references: [users.id],
    relationName: "approval_action_by"
  }),
}));

export const financialReportWorkflowLogsRelations = relations(financialReportWorkflowLogs, ({ one }) => ({
  report: one(financialReports, {
    fields: [financialReportWorkflowLogs.reportId],
    references: [financialReports.id],
    relationName: "report_workflow_history"
  }),
  actor: one(users, {
    fields: [financialReportWorkflowLogs.actorId],
    references: [users.id],
    relationName: "workflow_actor"
  }),
}));

// === SNAPSHOT AND PERIOD LOCKING RELATIONS ===

export const reportVersionsRelations = relations(reportVersions, ({ one }) => ({
  report: one(financialReports, {
    fields: [reportVersions.reportId],
    references: [financialReports.id],
    relationName: "report_versions"
  }),
  creator: one(users, {
    fields: [reportVersions.createdBy],
    references: [users.id],
    relationName: "version_creator"
  }),
}));

export const periodLocksRelations = relations(periodLocks, ({ one, many }) => ({
  reportingPeriod: one(reportingPeriods, {
    fields: [periodLocks.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  project: one(projects, {
    fields: [periodLocks.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [periodLocks.facilityId],
    references: [facilities.id]
  }),
  lockedByUser: one(users, {
    fields: [periodLocks.lockedBy],
    references: [users.id],
    relationName: "period_lock_locker"
  }),
  unlockedByUser: one(users, {
    fields: [periodLocks.unlockedBy],
    references: [users.id],
    relationName: "period_lock_unlocker"
  }),
  auditLogs: many(periodLockAuditLog, { relationName: "period_lock_audit_history" }),
}));

export const periodLockAuditLogRelations = relations(periodLockAuditLog, ({ one }) => ({
  periodLock: one(periodLocks, {
    fields: [periodLockAuditLog.periodLockId],
    references: [periodLocks.id],
    relationName: "period_lock_audit_history"
  }),
  performer: one(users, {
    fields: [periodLockAuditLog.performedBy],
    references: [users.id],
    relationName: "audit_performer"
  }),
}));

// === DOCUMENTS RELATIONS ===

export const documentsRelations = relations(documents, ({ one }) => ({
  executionEntry: one(schemaFormDataEntries, {
    fields: [documents.executionEntryId],
    references: [schemaFormDataEntries.id],
    relationName: "execution_entry_documents"
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
    relationName: "document_uploader"
  }),
  verifier: one(users, {
    fields: [documents.verifiedBy],
    references: [users.id],
    relationName: "document_verifier"
  }),
  updater: one(users, {
    fields: [documents.updatedBy],
    references: [users.id],
    relationName: "document_updater"
  }),
  deleter: one(users, {
    fields: [documents.deletedBy],
    references: [users.id],
    relationName: "document_deleter"
  }),
}));