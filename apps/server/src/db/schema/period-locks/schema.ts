import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    boolean,
    foreignKey,
    text,
    unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { reportingPeriods } from "../reporting-periods/schema";
import { projects } from "../projects/schema";
import { facilities } from "../facilities/schema";
import { users } from "../users/schema";

export const periodLocks = pgTable("period_locks", {
    id: serial().primaryKey().notNull(),
    reportingPeriodId: integer("reporting_period_id").notNull(),
    projectId: integer("project_id").notNull(),
    facilityId: integer("facility_id").notNull(),
    isLocked: boolean("is_locked").default(true),
    lockedBy: integer("locked_by"),
    lockedAt: timestamp("locked_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    lockedReason: text("locked_reason"),
    unlockedBy: integer("unlocked_by"),
    unlockedAt: timestamp("unlocked_at", { mode: 'date' }),
    unlockedReason: text("unlocked_reason"),
}, (table) => [
    foreignKey({
        columns: [table.reportingPeriodId],
        foreignColumns: [reportingPeriods.id],
        name: "period_locks_reporting_period_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.projectId],
        foreignColumns: [projects.id],
        name: "period_locks_project_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.facilityId],
        foreignColumns: [facilities.id],
        name: "period_locks_facility_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.lockedBy],
        foreignColumns: [users.id],
        name: "period_locks_locked_by_fkey"
    }),
    foreignKey({
        columns: [table.unlockedBy],
        foreignColumns: [users.id],
        name: "period_locks_unlocked_by_fkey"
    }),
    unique("period_lock_unique").on(
        table.reportingPeriodId,
        table.projectId,
        table.facilityId
    ),
]);
