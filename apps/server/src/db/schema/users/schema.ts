import { 
    boolean,
    pgTable,
    serial,
    text,
    integer,
    jsonb,
    timestamp
} from "drizzle-orm/pg-core";

// export const users = pgTable("users", {
  //     id: serial().primaryKey().notNull(),
  //     name: text().notNull(),
  //     email: text().notNull(),
  //     emailVerified: boolean("email_verified").notNull(),
  //     role: userRole().default("accountant").notNull(),
  //     facilityId: integer("facility_id"),
  
  //     permissions: jsonb("permissions"),
  //     projectAccess: jsonb("project_access"),
  //     configAccess: jsonb("config_access"),
  //     lastLoginAt: timestamp("last_login_at"),
  //     isActive: boolean("is_active").default(true),
  //     createdAt: timestamp("created_at", { mode: 'date' }).notNull(),
  //     updatedAt: timestamp("updated_at", { mode: 'date' }).notNull()
  // }, (table) => [
    //     foreignKey({
      //         columns: [table.facilityId],
      //         foreignColumns: [facilities.id],
      //         name: "users_facility_id_fkey"
      //     }),
      //     unique("users_email_key").on(table.email)
      // ])
      
import { userRole } from "../../enum/schema.enum";

export const users = pgTable("users", {
    id: serial().primaryKey().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    role: userRole().notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    facilityId: integer("facility_id"),

    permissions: jsonb("permissions").$type<string[]>().default([]),
    projectAccess: jsonb("project_access").$type<number[]>().default([]),

    configAccess: text("config_access"),
    lastLoginAt: timestamp("last_login_at"),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    mustChangePassword: boolean("must_change_password").default(true),
  });