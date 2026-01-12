import { 
    integer, 
    pgTable, 
    serial, 
    text, 
    timestamp, 
    varchar,
    jsonb,
    boolean
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const systemConfigurations = pgTable("system_configurations", {
    id: serial().primaryKey().notNull(),
    configKey: varchar("config_key", { length: 100 }).notNull(),
    configValue: jsonb("config_value").notNull(),
    description: text("description"),
    configType: varchar("config_type", { length: 50 }).notNull(), // 'form', 'mapping', 'validation', etc.
    scope: varchar({ length: 50 }).default('GLOBAL'), // 'GLOBAL', 'PROJECT', 'FACILITY'
    scopeId: integer("scope_id"), // Project or facility ID if scoped
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  })