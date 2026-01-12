import {
  integer,
  pgTable,
  serial,
  timestamp,
  text,
  jsonb,
  foreignKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { schemaFormDataEntries } from "../schema-form-data-entries/schema";
import { users } from "../users/schema";
import { approvalStatus } from "../../enum/schema.enum";

export const approvalAuditLog = pgTable("approval_audit_log", {
  id: serial().primaryKey().notNull(),
  planningId: integer("planning_id").notNull(),
  previousStatus: approvalStatus("previous_status"),
  newStatus: approvalStatus("new_status").notNull(),
  actionBy: integer("action_by").notNull(),
  actionAt: timestamp("action_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  comments: text("comments"),
  metadata: jsonb("metadata") // Additional context like IP, user agent, etc.
}, (table) => [
  foreignKey({
    columns: [table.planningId],
    foreignColumns: [schemaFormDataEntries.id],
    name: "approval_audit_log_planning_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.actionBy],
    foreignColumns: [users.id],
    name: "approval_audit_log_action_by_fkey"
  }).onDelete("cascade")
]);

export type SelectApprovalAuditLog = typeof approvalAuditLog.$inferSelect;
export type InsertApprovalAuditLog = typeof approvalAuditLog.$inferInsert;