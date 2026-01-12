import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    boolean,
    text
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { reportStatus } from "../../enum/schema.enum"
import { projects } from "../projects/schema";
import { facilities } from "../facilities/schema";
import { reportingPeriods } from "../reporting-periods/schema";
import { users } from "../users/schema";

export const financialReports = pgTable("financial_reports", {
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
    // Snapshot fields
    snapshotChecksum: varchar("snapshot_checksum", { length: 64 }),
    snapshotTimestamp: timestamp("snapshot_timestamp", { mode: 'date' }),
    sourceDataVersion: varchar("source_data_version", { length: 20 }),
    isOutdated: boolean("is_outdated").default(false),
    // Audit trail
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    submittedBy: integer("submitted_by"),
    submittedAt: timestamp("submitted_at", { mode: 'date' }),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at", { mode: 'date' }),
    // Approval workflow fields
    dafId: integer("daf_id"),
    dafApprovedAt: timestamp("daf_approved_at", { mode: 'date' }),
    dafComment: text("daf_comment"),
    dgId: integer("dg_id"),
    dgApprovedAt: timestamp("dg_approved_at", { mode: 'date' }),
    dgComment: text("dg_comment"),
    finalPdfUrl: text("final_pdf_url"),
    locked: boolean("locked").default(false),
  }, (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "financial_reports_project_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
      name: "financial_reports_facility_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reportingPeriodId],
      foreignColumns: [reportingPeriods.id],
      name: "financial_reports_reporting_period_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "financial_reports_created_by_fkey"
    }),
    foreignKey({
      columns: [table.dafId],
      foreignColumns: [users.id],
      name: "financial_reports_daf_id_fkey"
    }),
    foreignKey({
      columns: [table.dgId],
      foreignColumns: [users.id],
      name: "financial_reports_dg_id_fkey"
    }),
  ])