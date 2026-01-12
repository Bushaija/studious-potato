import { 
    integer, 
    pgTable, 
    serial, 
    text, 
    timestamp, 
} from "drizzle-orm/pg-core";
import { users } from "../users/schema";

// export const account = pgTable("account", {
//     id: serial().primaryKey().notNull(),
//     accountId: text("account_id").notNull(),
//     providerId: text("provider_id").notNull(),
//     userId: integer("user_id").notNull(),
//     accessToken: text("access_token"),
//     refreshToken: text("refresh_token"),
//     idToken: text("id_token"),
//     accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'date' }),
//     refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'date' }),
//     scope: text(),
//     password: text(),
//     createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
//     updatedAt: timestamp("updated_at", { mode: 'date' }).notNull(),
//   }, (table) => [
//     foreignKey({
//       columns: [table.userId],
//       foreignColumns: [users.id],
//       name: "account_user_id_users_id_fk"
//     }).onDelete("cascade"),
//   ]);

export const account = pgTable("account", {
  id: serial().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});