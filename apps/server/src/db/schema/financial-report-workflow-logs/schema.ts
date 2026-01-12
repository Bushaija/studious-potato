import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    text,
    foreignKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { workflowAction } from "../../enum/schema.enum";
import { financialReports } from "../financial-reports/schema";
import { users } from "../users/schema";

export const financialReportWorkflowLogs = pgTable("financial_report_workflow_logs", {
    id: serial().primaryKey().notNull(),
    reportId: integer("report_id").notNull(),
    action: workflowAction("action").notNull(),
    actorId: integer("actor_id").notNull(),
    comment: text("comment"),
    timestamp: timestamp("timestamp", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }, (table) => [
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [financialReports.id],
      name: "financial_report_workflow_logs_report_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.id],
      name: "financial_report_workflow_logs_actor_id_fkey"
    }).onDelete("cascade"),
  ])
