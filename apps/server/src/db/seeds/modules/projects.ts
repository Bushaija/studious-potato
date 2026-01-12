import { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";

interface ProjectData {
    name: string;
    code: string;
    description: string;
    projectType: "HIV" | "Malaria" | "TB";
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    metadata: Record<string, any> | null;
}

/* eslint-disable no-console */
export default async function seed(db: Database) {
    console.log("Seeding projects...");

    const projectsData: ProjectData[] = [
        {
            name: 'HIV National Strategic Plan',
            code: 'HIV',
            description: 'HIV/AIDS prevention, treatment and care program',
            projectType: 'HIV',
            status: 'ACTIVE',
            metadata: null,
        },
        {
            name: 'Malaria Control Program',
            code: 'MAL',
            description: 'National malaria prevention and control initiatives',
            projectType: 'Malaria',
            status: 'ACTIVE',
            metadata: null,
        },
        {
            name: 'Tuberculosis Control Program',
            code: 'TB',
            description: 'National TB prevention, diagnosis and treatment program',
            projectType: 'TB',
            status: 'ACTIVE',   
            metadata: null,
        },
    ];

    const seedManager = new SeedManager(db);
    console.log(`Prepared ${projectsData.length} projects`);
    if (projectsData.length === 0) {
        throw new Error("No projects prepared");
    }
    await seedManager.seedWithConflictResolution(schema.projects, projectsData, {
        uniqueFields: ["code"],
        onConflict: "skip",
        updateFields: ["name", "description", "projectType", "status", "metadata"],
    });
    console.log(`Seeded ${projectsData.length} projects.`);
}
