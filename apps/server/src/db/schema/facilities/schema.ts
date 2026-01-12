import { foreignKey, integer, pgTable, serial, text, unique, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { facilityType } from "../../enum/schema.enum";
import { districts } from "../districts/schema";
import { sql } from "drizzle-orm";

// export const facilities = pgTable("facilities", {
//     id: serial().primaryKey().notNull(),
//     name: text().notNull(),
//     facilityType: facilityType("facility_type").notNull(),
//     districtId: integer("district_id").notNull(),
//   }, (table) => [
//     foreignKey({
//       columns: [table.districtId],
//       foreignColumns: [districts.id],
//       name: "facilities_district_id_fkey"
//     }),
//     unique("facilities_name_district_id_key").on(table.name, table.districtId),
//   ])

export const facilities = pgTable("facilities", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  facilityType: facilityType("facility_type").notNull(),
  districtId: integer("district_id").notNull(),
  parentFacilityId: integer("parent_facility_id"),
  status: varchar({ length: 20 }).default('ACTIVE'),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  foreignKey({
    columns: [table.districtId],
    foreignColumns: [districts.id],
    name: "facilities_district_id_fkey"
  }),
  foreignKey({
    columns: [table.parentFacilityId],
    foreignColumns: [table.id],
    name: "facilities_parent_facility_id_fkey"
  }),
  unique("facilities_name_district_id_key").on(table.name, table.districtId),
  index("idx_facilities_parent").on(table.parentFacilityId),
  index("idx_facilities_district_type").on(table.districtId, table.facilityType),
]);