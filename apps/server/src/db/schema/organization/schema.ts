import { 
    pgTable, 
    timestamp, 
    text,
    serial,
} from "drizzle-orm/pg-core";

export const organization = pgTable("organization", {
    id: serial().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  });