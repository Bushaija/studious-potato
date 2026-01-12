import { sql } from "drizzle-orm";
import { boolean, real, timestamp, varchar, integer, serial } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: serial().primaryKey().notNull(),
  code: varchar("code", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 128 }),
  status: varchar("status", {
    length: 30,
    enum: ["todo", "in-progress", "done", "canceled"],
  })
    .notNull()
    .default("todo"),
  label: varchar("label", {
    length: 30,
    enum: ["bug", "feature", "enhancement", "documentation"],
  })
    .notNull()
    .default("bug"),
  priority: varchar("priority", {
    length: 30,
    enum: ["low", "medium", "high"],
  })
    .notNull()
    .default("low"),
  estimatedHours: real("estimated_hours").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`current_timestamp`)
    .$onUpdate(() => new Date()),
});

export const products = pgTable("products", {
  id: serial().primaryKey().notNull(),
  sku: varchar("sku", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", {
    length: 50,
    enum: ["electronics", "clothing", "books", "home"],
  }).notNull().default("electronics"),
  status: varchar("status", {
    length: 30,
    enum: ["active", "inactive", "discontinued"],
  }).notNull().default("active"),
  price: real("price").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`current_timestamp`)
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
