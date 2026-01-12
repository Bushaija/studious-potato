import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    text,
    unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { financialReports } from "../financial-reports/schema";
import { users } from "../users/schema";

export const reportVersions = pgTable("report_versions", {
    id: serial().primaryKey().notNull(),
    reportId: integer("report_id").notNull(),
    versionNumber: varchar("version_number", { length: 20 }).notNull(),
    snapshotData: jsonb("snapshot_data").notNull(),
    snapshotChecksum: varchar("snapshot_checksum", { length: 64 }).notNull(),
    snapshotTimestamp: timestamp("snapshot_timestamp", { mode: 'date' }).notNull(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    changesSummary: text("changes_summary"),
}, (table) => [
    foreignKey({
        columns: [table.reportId],
        foreignColumns: [financialReports.id],
        name: "report_versions_report_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.createdBy],
        foreignColumns: [users.id],
        name: "report_versions_created_by_fkey"
    }),
    unique("report_version_unique").on(table.reportId, table.versionNumber),
]);
