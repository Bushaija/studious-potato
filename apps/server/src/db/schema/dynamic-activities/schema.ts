import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    boolean,
    text,
    unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { 
  projectType, 
  facilityType, 
  moduleType
} from "../../enum/schema.enum";
import { schemaActivityCategories } from "../schema-activity-categories/schema";


export const dynamicActivities = pgTable("dynamic_activities", {
    id: serial().primaryKey().notNull(),
    categoryId: integer("category_id").notNull(),
    projectType: projectType("project_type"),
    facilityType: facilityType("facility_type"),
    moduleType: moduleType("module_type"),
    code: varchar({ length: 100 }),
    name: varchar({ length: 300 }).notNull(),
    description: text(),
    activityType: varchar("activity_type", { length: 100 }), // "HC Nurses (A1) Salary", etc.
    displayOrder: integer("display_order").notNull(),
    isTotalRow: boolean("is_total_row").default(false),
    isAnnualOnly: boolean("is_annual_only").default(false),
    // Activity configuration
    fieldMappings: jsonb("field_mappings"), // Maps to form fields
    computationRules: jsonb("computation_rules"), // How values are calculated
    validationRules: jsonb("validation_rules"), // Activity-specific validation
    metadata: jsonb("metadata"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [schemaActivityCategories.id],
      name: "dynamic_activities_category_id_fkey"
    }).onDelete("cascade"),
    // Prevent duplicate dynamic activities for the same category/code
    unique("dynamic_activities_category_code").on(table.categoryId, table.code),
  ])