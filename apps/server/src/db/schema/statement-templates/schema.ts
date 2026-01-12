import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    foreignKey,
    boolean,
    text
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const statementTemplates = pgTable("statement_templates", {
    id: serial().primaryKey().notNull(),
    statementCode: varchar("statement_code", { length: 50 }).notNull(), // REV_EXP", "ASSETS_LIAB", etc.
    statementName: varchar("statement_name", { length: 200 }).notNull(),
    lineItem: varchar("line_item", { length: 300 }).notNull(), // display name
    lineCode: varchar("line_code", { length: 50 }).notNull(), // unique identifier within statement
    parentLineId: integer("parent_line_id"), // for hierarchical structure
    displayOrder: integer("display_order").notNull(), 
    level: integer("level").default(1), // indentation level (1=main, 2=sub, 3=sub-sub)
    
    // mapping configuration
    eventMappings: jsonb("event_mappings").notNull().default('[]'), // Array of event IDs or mapping rules
    calculationFormula: text("calculation_formula"), // for computed lines
    aggregationMethod: varchar("aggregation_method", { length: 50 }).notNull().default('SUM'), // SUM, DIFF, AVERAGE, MAX, MIN, etc.
    
    // Conditional display
    isTotalLine: boolean("is_total_line").notNull().default(false),
    isSubtotalLine: boolean("is_subtotal_line").notNull().default(false),
    displayConditions: jsonb("display_conditions").notNull().default('{}'), // When to show this line
    formatRules: jsonb("format_rules").notNull().default('{}'), // styling, currency format, etc

    // ENHANCED FIELDS FOR DYNAMIC STATEMENT GENERATION
    columns: jsonb("columns").notNull().default('[]'), // Column definitions for the statement
    validationRules: jsonb("validation_rules").notNull().default('[]'), // Statement validation rules
    statementMetadata: jsonb("statement_metadata").notNull().default('{}'), // Statement-level configuration

    // additional properties
    metadata: jsonb("metadata").notNull().default('{}'),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  }, (table) => [
    foreignKey({
      columns: [table.parentLineId],
      foreignColumns: [table.id],
      name: "statement_templates_parent_line_id_fkey"
    }).onDelete("set null"),
  ])