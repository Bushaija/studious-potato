import type { Database } from "@/db";
import * as schema from "@/db/schema";
import facilityData from "../data/facilities.json";
import hospitalDistrictMap from "../data/hospital-district-mapping.json";

export default async function seed(db: Database) {
    console.log("Seeding facilities...");

    const districts = await db.query.districts.findMany();
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const districtMap = new Map(districts.map(d => [normalize(d.name), d.id]));

    const allProgramsToInsert: any[] = [];

    for (const group of facilityData) {
        const hospitalName = group.hospitals?.[0];
        if (!hospitalName) continue;

        const hospitalKey = normalize(hospitalName);
        const districtName = (hospitalDistrictMap as any)[hospitalKey];

        if (!districtName) {
            console.warn(`Skipping ${hospitalName} — no district mapping found.`);
            continue;
        }

        const districtId = districtMap.get(normalize(districtName));

        if (!districtId) {
            console.warn(`Skipping ${hospitalName} — district not found.`);
            continue;
        }

        // Track names used in this district to detect conflicts
        const existingNames = new Set<string>();

        const ensureUniqueName = (rawName: string, type: "hospital" | "health_center") => {
            const clean = rawName.trim();
            const normalizedKey = normalize(clean);

            if (existingNames.has(normalizedKey)) {
                // Conflict detected - append facility type
                const suffix = type === "hospital" ? "hospital" : "health center";
                existingNames.add(normalize(`${clean} ${suffix}`));
                return `${clean} ${suffix}`;
            }

            existingNames.add(normalizedKey);
            return clean;
        };

        // 1️⃣ Insert hospital first
        const hospitalFinalName = ensureUniqueName(hospitalName, "hospital");

        const [hospital] = await db
            .insert(schema.facilities)
            .values({
                name: hospitalFinalName,
                facilityType: "hospital",
                districtId,
            })
            .onConflictDoUpdate({
                target: [schema.facilities.name, schema.facilities.districtId],
                set: { facilityType: "hospital" },
            })
            .returning();

        // 2️⃣ Insert health centers with hospital as parent
        const healthCenterNames = group["health-centers"] ?? [];
        const healthCenters = [];

        for (const name of healthCenterNames) {
            const hcFinalName = ensureUniqueName(name, "health_center");

            const [hc] = await db
                .insert(schema.facilities)
                .values({
                    name: hcFinalName,
                    facilityType: "health_center",
                    districtId,
                    parentFacilityId: hospital.id,
                })
                .onConflictDoUpdate({
                    target: [schema.facilities.name, schema.facilities.districtId],
                    set: {
                        facilityType: "health_center",
                        parentFacilityId: hospital.id,
                    },
                })
                .returning();

            healthCenters.push(hc);
        }

        // 3️⃣ Insert facility-program relationships (hospital + all its HCs)
        const program = group.program;
        if (program) {
            const facilityRecords = [hospital, ...healthCenters];
            for (const facility of facilityRecords) {
                allProgramsToInsert.push({
                    facilityId: facility.id,
                    program: program.toLowerCase(),
                });
            }
        }
    }

    console.log(`✅ Seeded facility hierarchy and prepared ${allProgramsToInsert.length} program links.`);
    console.log("✅ Facility seeding complete.");
}
