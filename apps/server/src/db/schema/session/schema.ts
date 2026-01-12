import { 
    integer, 
    pgTable, 
    serial, 
    text, 
    timestamp, 
    foreignKey, 
    unique 
} from "drizzle-orm/pg-core";
import { users } from "../users/schema";

// export const session = pgTable("session", {
//     id: serial().primaryKey().notNull(),
//     expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
//     token: text().notNull(),
//     createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
//     updatedAt: timestamp("updated_at", { mode: 'date' }).notNull(),
//     ipAddress: text("ip_address"),
//     userAgent: text("user_agent"),
//     userId: integer("user_id").notNull(),
//   }, (table) => [
//     foreignKey({
//       columns: [table.userId],
//       foreignColumns: [users.id],
//       name: "session_user_id_users_id_fk"
//     }).onDelete("cascade"),
//     unique("session_token_unique").on(table.token),
//   ])

export const session = pgTable("session", {
  id: serial().primaryKey().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  activeOrganizationId: text("active_organization_id"),
});