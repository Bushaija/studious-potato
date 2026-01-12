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

import { formFieldType } from "../../enum/schema.enum";
import { formSchemas } from "../form-schemas/schema";

export const formFields = pgTable("form_fields", {
    id: serial().primaryKey().notNull(),
    schemaId: integer("schema_id").notNull(),
    fieldKey: varchar("field_key", { length: 100 }).notNull(),
    label: varchar({ length: 200 }).notNull(),
    fieldType: formFieldType("field_type").notNull(),
    isRequired: boolean("is_required").default(false),
    displayOrder: integer("display_order").notNull(),
    parentFieldId: integer("parent_field_id"), // For nested/grouped fields
    categoryId: integer("category_id"), // Link to activity categories
    // Field configuration
    fieldConfig: jsonb("field_config"), // Type-specific configuration
    validationRules: jsonb("validation_rules"), // Validation rules
    computationFormula: text("computation_formula"), // For calculated fields
    defaultValue: jsonb("default_value"),
    helpText: text("help_text"),
    isVisible: boolean("is_visible").default(true),
    isEditable: boolean("is_editable").default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.schemaId],
      foreignColumns: [formSchemas.id],
      name: "form_fields_schema_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.parentFieldId],
      foreignColumns: [table.id],
      name: "form_fields_parent_field_id_fkey"
    }),
  ])