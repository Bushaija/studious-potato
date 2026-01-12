import { 
    pgTable, 
    serial, 
    text, 
    timestamp, 
} from "drizzle-orm/pg-core";

// export const verification = pgTable("verification", {
//     id: serial().primaryKey().notNull(),
//     identifier: text().notNull(),
//     value: text().notNull(),
//     expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
//     createdAt: timestamp("created_at", { mode: 'date' }),
//     updatedAt: timestamp("updated_at", { mode: 'date' }),
//   })

export const verification = pgTable("verification", {
    id: serial().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  });