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

import { projectType } from "../../enum/schema.enum";
import { facilities } from "../facilities/schema";
import { reportingPeriods } from "../reporting-periods/schema";
import { users } from "../users/schema";

export const projects = pgTable("projects", {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    status: varchar({ length: 20 }).default('ACTIVE'),
    code: varchar({ length: 10 }).notNull(),
    description: text(),
    projectType: projectType("project_type"),
    facilityId: integer("facility_id"),
    reportingPeriodId: integer("reporting_period_id"),
    userId: integer("user_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
      name: "projects_facility_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reportingPeriodId],
      foreignColumns: [reportingPeriods.id],
      name: "projects_reporting_period_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "projects_user_id_fkey"
    }).onDelete("cascade"),
    unique("projects_name_key").on(table.name),
    unique("projects_code_key").on(table.code),
  ])

