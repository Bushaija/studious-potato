import { 
    pgTable, 
    timestamp, 
    text,
    serial,
    integer
} from "drizzle-orm/pg-core";
import { organization, users } from "@/db/schema";

export const member = pgTable("member", {
  id: serial().primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});