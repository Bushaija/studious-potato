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
    facilityType, 
    moduleType, 
    projectType 
} from "../../enum/schema.enum";


export const schemaActivityCategories = pgTable("schema_activity_categories", {
    id: serial().primaryKey().notNull(),
    projectType: projectType("project_type"),
    facilityType: facilityType("facility_type"),
    code: varchar({ length: 50 }).notNull(),
    subCategoryCode: varchar("sub_category_code", { length: 50 }),
    name: varchar({ length: 200 }).notNull(),
    description: text(),
    moduleType: moduleType("module_type").notNull(),
    displayOrder: integer("display_order").notNull(),
    parentCategoryId: integer("parent_category_id"), // For hierarchical categories
    isSubCategory: boolean("is_sub_category").default(false),
    isComputed: boolean("is_computed").default(false),
    computationFormula: text("computation_formula"),
    payableActivityId: integer("payable_activity_id"), // References Section E payable for Section B expenses
    metadata: jsonb("metadata"), // Category-specific configuration
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.parentCategoryId],
      foreignColumns: [table.id],
      name: "schema_activity_categories_parent_fkey"
    }),
    foreignKey({
      columns: [table.payableActivityId],
      foreignColumns: [table.id],
      name: "fk_payable_activity"
    }),
    unique("schema_categories_type_code").on(table.projectType, table.facilityType, table.code, table.moduleType),
  ])