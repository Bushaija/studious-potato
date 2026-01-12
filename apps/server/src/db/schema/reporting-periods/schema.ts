import { sql } from "drizzle-orm";
import { date, integer, pgTable, serial, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const reportingPeriods = pgTable("reporting_periods", {
    id: serial().primaryKey().notNull(),
    year: integer().notNull(),
    periodType: varchar("period_type", { length: 20 }).default('ANNUAL'),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar({ length: 20 }).default('ACTIVE'),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    unique("reporting_periods_year_period_type_key").on(table.year, table.periodType),
  ])