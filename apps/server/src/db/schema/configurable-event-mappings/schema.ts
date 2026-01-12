import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    jsonb,
    foreignKey,
    boolean,
    text,
    numeric,
    unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { 
    projectType,
    facilityType,
    mappingType
 } from "../../enum/schema.enum";
 import { events } from "../events/schema";
import { dynamicActivities } from "../dynamic-activities/schema";
import { schemaActivityCategories } from "../schema-activity-categories/schema";

export const configurableEventMappings = pgTable("configurable_event_mappings", {
    id: serial().primaryKey().notNull(),
    eventId: integer("event_id").notNull(),
    activityId: integer("activity_id"), // specific activity
    categoryId: integer("category_id"), // or entire category
    projectType: projectType("project_type"),
    facilityType: facilityType("facility_type"),
    mappingType: mappingType("mapping_type").default('DIRECT'),
    mappingFormula: text("mapping_formula"), // For computed mappings
    mappingRatio: numeric("mapping_ratio", { precision: 10, scale: 4 }).default('1.0000'),
    isActive: boolean("is_active").default(true),
    effectiveFrom: timestamp("effective_from", { mode: 'date' }),
    effectiveTo: timestamp("effective_to", { mode: 'date' }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: "configurable_event_mappings_event_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.activityId],
      foreignColumns: [dynamicActivities.id],
      name: "configurable_event_mappings_activity_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [schemaActivityCategories.id],
      name: "configurable_event_mappings_category_id_fkey"
    }).onDelete("cascade"),
    // Ensure a single mapping per combination
    unique("configurable_event_mappings_unique_key").on(
      table.eventId,
      table.activityId,
      table.categoryId,
      table.projectType,
      table.facilityType
    ),
  ]);