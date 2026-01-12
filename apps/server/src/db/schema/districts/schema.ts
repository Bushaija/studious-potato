import { pgTable, serial, text, unique, foreignKey, integer } from "drizzle-orm/pg-core";
import { provinces } from "../provinces/schema";

export const districts = pgTable("districts", {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    provinceId: integer("province_id").notNull(),
  }, (table) => [
    foreignKey({
      columns: [table.provinceId],
      foreignColumns: [provinces.id],
      name: "districts_province_id_fkey"
    }),
    unique("districts_name_province_id_key").on(table.name, table.provinceId),
  ]);

