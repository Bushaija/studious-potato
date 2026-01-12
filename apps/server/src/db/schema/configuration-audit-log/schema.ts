import { 
    integer, 
    pgTable, 
    serial, 
    text, 
    timestamp, 
    foreignKey, 
    varchar,
    jsonb
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "../users/schema";

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
      foreignColumns: [users.id],
      name: "configuration_audit_log_changed_by_fkey"
    }),
  ])