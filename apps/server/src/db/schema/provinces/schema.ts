import { pgTable, serial, text, unique } from "drizzle-orm/pg-core";

export const provinces = pgTable("provinces", {
    id: serial().primaryKey().notNull(),
    name: text().notNull()
}, (table) => [
    unique("provinces_name_key").on(table.name)
]);