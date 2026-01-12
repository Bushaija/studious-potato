import { integer, pgTable, serial, text, varchar, timestamp, unique, check, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { balanceType, eventType } from "../../enum/schema.enum";

export const events = pgTable("events", {
    id: serial().primaryKey().notNull(),
    noteNumber: integer("note_number").notNull(),
    code: varchar({ length: 50 }).notNull(),
    description: text().notNull(),
    statementCodes: text("statement_codes").array().notNull(),
    balanceType: balanceType("balance_type").notNull(), // accounting nature
    eventType: eventType("event_type").notNull(),
    displayOrder: integer("display_order").notNull(),
    metadata: jsonb("metadata").notNull().default('{}'), // additional properties
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    unique("events_note_number_key").on(table.noteNumber),
    unique("events_code_key").on(table.code),
    check("events_event_type_check", sql`(event_type)::text = ANY (ARRAY[('REVENUE'::character varying)::text, ('EXPENSE'::character varying)::text, ('ASSET'::character varying)::text, ('LIABILITY'::character varying)::text, ('EQUITY'::character varying)::text])`),
  ]);