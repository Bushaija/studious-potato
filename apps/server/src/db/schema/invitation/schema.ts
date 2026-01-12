import { 
    pgTable, 
    timestamp, 
    foreignKey,
    text,
    serial,
    integer
} from "drizzle-orm/pg-core";
import { organization, users } from "@/db/schema";

export const invitation = pgTable("invitation", {
    id: serial().primaryKey(),
    organizationId: integer("organization_id").notNull(),
    email: text().notNull(),
    role: text().notNull(),
    status: text().notNull(),
    expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
    inviterId: integer("inviter_id").notNull(),
  }, (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "invitation_organization_id_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [users.id],
      name: "invitation_inviter_id_fk"
    }).onDelete("cascade"),
  ])