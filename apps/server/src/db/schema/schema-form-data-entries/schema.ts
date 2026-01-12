import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  jsonb,
  foreignKey,
  unique,
  text
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { formSchemas } from "../form-schemas/schema";
import { projects } from "../projects/schema";
import { facilities } from "../facilities/schema";
import { users } from "../users/schema";
import { approvalStatus } from "../../enum/schema.enum";

export const schemaFormDataEntries = pgTable("schema_form_data_entries", {
  id: serial().primaryKey().notNull(),
  schemaId: integer("schema_id").notNull(),
  entityId: integer("entity_id"), // Planning data, execution data, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'planning', 'execution'
  projectId: integer("project_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  reportingPeriodId: integer("reporting_period_id").notNull(), // Required: links to fiscal year
  
  // Dynamic data storage
  formData: jsonb("form_data").notNull(), // All form field values
  computedValues: jsonb("computed_values"), // Auto-calculated values
  validationState: jsonb("validation_state"), // Validation results
  metadata: jsonb("metadata"),

  // NEW; Approval workflow
  approvalStatus: approvalStatus("approval_status").default('PENDING'), // PENDING | APPROVED | REJECTED
  reviewedBy: integer("reviewed_by"), // user ID of the planner
  reviewedAt: timestamp("reviewed_at", { mode: 'date' }),
  reviewComments: text("review_comments"),
  
  // NEW: File upload traceability
  sourceFileName: text("source_file_name"), // e.g., plan_upload_fy2026.xlsx
  sourceFileUrl: text("source_file_url"),   // optional if stored in S3 or local

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
    foreignColumns: [projects.id],
    name: "schema_form_data_entries_project_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.reviewedBy],
    foreignColumns: [users.id],
    name: "schema_form_data_entries_user_id_fkey"
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
    name: "schema_form_data_entries_facility_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "schema_form_data_entries_created_by_fkey"
  }),
  unique("unique_planning_entry").on(
    table.facilityId,
    table.projectId,
    table.entityType,
    table.reportingPeriodId
  ),
])