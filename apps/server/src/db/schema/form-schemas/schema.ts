import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    boolean,
    uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { facilityType, moduleType, projectType } from "../../enum/schema.enum";
import { users } from "../users/schema";

export const formSchemas = pgTable("form_schemas", {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    version: varchar({ length: 20 }).notNull(),
    projectType: projectType("project_type"),
    facilityType: facilityType("facility_type"),
    moduleType: moduleType("module_type").notNull(), // 'planning', 'execution', 'reporting'
    isActive: boolean("is_active").default(true),
    schema: jsonb("schema").notNull(), // Complete form schema definition
    metadata: jsonb("metadata"), // Additional schema metadata
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "form_schemas_created_by_fkey"
    }),
    uniqueIndex("form_schemas_unique_idx").on(
      table.name,
      table.version,
      table.projectType,
      table.facilityType,
      table.moduleType
    ),
  ])