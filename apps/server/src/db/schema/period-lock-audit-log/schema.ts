import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    text
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { periodLocks } from "../period-locks/schema";
import { users } from "../users/schema";

export const periodLockAuditLog = pgTable("period_lock_audit_log", {
    id: serial().primaryKey().notNull(),
    periodLockId: integer("period_lock_id").notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    performedBy: integer("performed_by").notNull(),
    performedAt: timestamp("performed_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    reason: text("reason"),
    metadata: jsonb("metadata"),
}, (table) => [
    foreignKey({
        columns: [table.periodLockId],
        foreignColumns: [periodLocks.id],
        name: "period_lock_audit_log_period_lock_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.performedBy],
        foreignColumns: [users.id],
        name: "period_lock_audit_log_performed_by_fkey"
    }),
]);
