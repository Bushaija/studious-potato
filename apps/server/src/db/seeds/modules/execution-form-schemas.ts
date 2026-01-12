import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";
import { eq } from "drizzle-orm";

interface FormSchemaData {
    name: string;
    version: string;
    projectType: "HIV" | "Malaria" | "TB";
    facilityType: "hospital" | "health_center";
    moduleType: "planning" | "execution" | "reporting";
    isActive: boolean;
    schema: any;
    metadata?: any;
}

const executionFormSchemas: FormSchemaData[] = [
    {
        name: "HIV Execution Form",
        version: "1.0",
        projectType: "HIV",
        facilityType: "hospital",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "HIV Execution Form",
            description: "Quarterly execution reporting for HIV program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "HIV program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
    {
        name: "HIV Execution Form",
        version: "1.0",
        projectType: "HIV",
        facilityType: "health_center",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "HIV Execution Form",
            description: "Quarterly execution reporting for HIV program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "HIV program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
    {
        name: "Malaria Execution Form",
        version: "1.0",
        projectType: "Malaria",
        facilityType: "hospital",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "Malaria Execution Form",
            description: "Quarterly execution reporting for Malaria program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "Malaria program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
    {
        name: "Malaria Execution Form",
        version: "1.0",
        projectType: "Malaria",
        facilityType: "health_center",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "Malaria Execution Form",
            description: "Quarterly execution reporting for Malaria program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "Malaria program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
    {
        name: "TB Execution Form",
        version: "1.0",
        projectType: "TB",
        facilityType: "hospital",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "TB Execution Form",
            description: "Quarterly execution reporting for TB program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "TB program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
    {
        name: "TB Execution Form",
        version: "1.0",
        projectType: "TB",
        facilityType: "hospital",
        moduleType: "execution",
        isActive: true,
        schema: {
            title: "TB Execution Form",
            description: "Quarterly execution reporting for TB program",
            sections: [
                {
                    id: "quarterly_execution",
                    title: "Quarterly Execution Data",
                    fields: [
                        { key: "q1_amount", type: "currency", required: true },
                        { key: "q2_amount", type: "currency", required: true },
                        { key: "q3_amount", type: "currency", required: true },
                        { key: "q4_amount", type: "currency", required: true },
                        { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
                        { key: "comment", type: "textarea", required: false },
                    ],
                },
            ],
        },
        metadata: {
            createdFor: "TB program execution reporting",
            calculatedFields: ["cumulative_balance"],
            lastUpdated: new Date().toISOString(),
        },
    },
];

export default async function seedExecutionFormSchemas(db: Database) {
    console.log("Seeding execution form schemas...");

    const adminUser = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, 'admin'))
        .limit(1);

    const createdBy = adminUser[0]?.id ?? 1;

    const formSchemaRows = executionFormSchemas.map((formSchema) => ({
        name: formSchema.name,
        version: formSchema.version,
        projectType: formSchema.projectType,
        facilityType: formSchema.facilityType,
        moduleType: formSchema.moduleType,
        isActive: formSchema.isActive,
        schema: formSchema.schema,
        metadata: formSchema.metadata ?? {},
        createdBy,
    }));

    const seedManager = new SeedManager(db);
    await seedManager.seedWithConflictResolution(schema.formSchemas, formSchemaRows, {
        uniqueFields: ["name", "version", "projectType", "facilityType", "moduleType"],
        onConflict: "skip",
        updateFields: ["isActive", "schema", "metadata", "createdBy"],
    });

    console.log(`Seeded ${formSchemaRows.length} execution form schemas.`);
}


