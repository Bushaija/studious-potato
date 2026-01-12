import type {Database} from "@/db";

import * as schema from "@/db/schema";
import data from "../data/districts-provinces.json";
import { SeedManager } from "../utils/seed-manager";

interface DistrictProvinceData {
    id: number;
    province: string;
    district: string;
}

const typedData: DistrictProvinceData[] = data;

/* eslint-disable no-console */
export default async function seed(db: Database) {
    console.log("Seeding provinces and districts...");

    const provinceNames = [...new Set(typedData.map((item) => item.province))];
    const provinceValues = provinceNames.map((name) => ({ name }));

    const seedManager = new SeedManager(db);
    await seedManager.seedWithConflictResolution(schema.provinces, provinceValues, {
        uniqueFields: ["name"],
        onConflict: "skip",
    });
    console.log("Provinces seeded.");

    const allProvinces = await db.query.provinces.findMany();
    const provinceMap = new Map(allProvinces.map((p) => [p.name, p.id]));

    const districtValues = typedData.map((item) => {
        const provinceId = provinceMap.get(item.province);
        if (provinceId === undefined) {
            throw new Error(`Province "${item.province}" not found for district "${item.district}"`);
        }
        return {
            name: item.district,
            provinceId,
        };
    });

    await seedManager.seedWithConflictResolution(schema.districts, districtValues, {
        uniqueFields: ["name", "provinceId"],
        onConflict: "skip",
    });
    console.log("Districts seeded.");
}
