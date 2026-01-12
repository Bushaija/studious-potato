import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    jsonb,
    boolean,
    text,
    unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const statementConfigurations = pgTable("statement_configurations", {
    id: serial().primaryKey().notNull(),
    statementCode: varchar("statement_code", { length: 50 }).notNull(),
    statementName: varchar("statement_name", { length: 200 }).notNull(),
    description: text("description"),
    statementType: varchar("statement_type", { length: 20 }).notNull(), // PERFORMANCE, POSITION, CASH_FLOW, COMPARISON
    version: varchar("version", { length: 20 }).notNull().default('1.0'),
    
    // Configuration JSON
    configuration: jsonb("configuration").notNull(), // StatementDefinition JSON
    
    // Metadata
    isActive: boolean("is_active").notNull().default(true),
    isTemplate: boolean("is_template").notNull().default(false),
    sourceTemplate: varchar("source_template", { length: 50 }),
    tags: text("tags").array(), // Array of tags for categorization
    
    // Audit fields
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by"),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    
    // Additional metadata
    metadata: jsonb("metadata").notNull().default('{}'),
  }, (table) => [
    // Unique constraint on statement code and version
    unique("statement_configurations_code_version_key").on(table.statementCode, table.version),
  ]);

// Index for active configurations
export const statementConfigurationsActiveIdx = {
  name: "statement_configurations_active_idx",
  columns: [statementConfigurations.statementCode, statementConfigurations.isActive]
};

// Index for statement type
export const statementConfigurationsTypeIdx = {
  name: "statement_configurations_type_idx", 
  columns: [statementConfigurations.statementType, statementConfigurations.isActive]
};