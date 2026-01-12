import db from "@/db";
import * as schema from "@/db/schema";
import { sql } from "drizzle-orm";
import provincesDistricts from "./modules/provinces-districts";
import facilities from "./modules/facilities";
import reportingPeriods from "./modules/reporting-periods";
import events from "./modules/events";
import projects from "./modules/projects";
import users from "./modules/users";

// Planning module imports
import { 
    seedEnhancedPlanningData, 
    seedProgramPlanningData,
    seedFormSchemas,
    seedSchemaActivityCategories,
    seedDynamicActivities
} from "./modules/planning-activities";

import { 
    seedExecutionCategories, 
    seedExecutionActivities,
    seedExecutionDataForProgram
} from "./modules/execution-categories-activities";
import seedExecutionFormSchemas from "./modules/execution-form-schemas";
import { 
    seedExecutionEventMappings,
} from "./modules/configurable-event-mappings";

// Enhanced statement templates
import seedEnhancedStatementTemplates from "./modules/statements.seeder";

// Other module imports
import systemConfigurations from "./modules/system-configurations";
import formFields from "./modules/form-fields";

type TableRef = any;
type TableInfo = { ref: TableRef; name: string };

const seederTables: Record<string, TableInfo[]> = {
    "Provinces & Districts": [
        { ref: schema.provinces, name: "provinces" },
        { ref: schema.districts, name: "districts" },
    ],
    "Facilities": [
        { ref: schema.facilities, name: "facilities" },
    ],
    "Reporting Periods": [
        { ref: schema.reportingPeriods, name: "reporting_periods" },
    ],
    "Events": [
        { ref: schema.events, name: "events" },
    ],
    "Users": [
        { ref: schema.users, name: "users" },
        { ref: schema.account, name: "account" },
    ],
    "Projects": [
        { ref: schema.projects, name: "projects" },
    ],
    "Planning Form Schemas": [
        { ref: schema.formSchemas, name: "form_schemas" },
    ],
    "Execution Form Schemas": [
        { ref: schema.formSchemas, name: "form_schemas" },
    ],
    "Schema Activity Categories": [
        { ref: schema.schemaActivityCategories, name: "schema_activity_categories" },
    ],
    "Execution Categories": [
        { ref: schema.schemaActivityCategories, name: "schema_activity_categories" },
    ],
    "Dynamic Activities": [
        { ref: schema.dynamicActivities, name: "dynamic_activities" },
    ],
    "Execution Activities": [
        { ref: schema.dynamicActivities, name: "dynamic_activities" },
    ],
    "Execution Event Mappings": [
        { ref: schema.configurableEventMappings, name: "configurable_event_mappings" },
    ],
    "Configurable Event Mappings": [
        { ref: schema.configurableEventMappings, name: "configurable_event_mappings" },
    ],
    "Enhanced Statement Templates": [
        { ref: schema.statementTemplates, name: "statement_templates" },
    ],
    "Form Fields": [
        { ref: schema.formFields, name: "form_fields" },
    ],
    "Statement Templates": [
        { ref: schema.statementTemplates, name: "statement_templates" },
    ],
    "System Configurations": [
        { ref: schema.systemConfigurations, name: "system_configurations" },
    ],
    "Enhanced Planning Data": [
        { ref: schema.formSchemas, name: "form_schemas" },
        { ref: schema.schemaActivityCategories, name: "schema_activity_categories" },
        { ref: schema.dynamicActivities, name: "dynamic_activities" },
        { ref: schema.configurableEventMappings, name: "configurable_event_mappings" },
    ],
};

async function countTable(table: TableRef): Promise<number> {
    const [row] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(table);
    return (row?.count as number) ?? 0;
}

async function countTables(tables: TableInfo[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    for (const t of tables) {
        results[t.name] = await countTable(t.ref);
    }
    return results;
}

const seeders = [
    // Layer 1: Base geographical and infrastructure data (no dependencies)
    { name: "Provinces & Districts", fn: provincesDistricts },
    { name: "Facilities", fn: facilities }, // depends on districts
    { name: "Reporting Periods", fn: reportingPeriods },
    { name: "Events", fn: events },
    
    // Layer 2: Core entities that others depend on
    { name: "Users", fn: users }, // MUST come before form schemas (created_by FK)
    { name: "Projects", fn: projects }, // depends on facilities, reporting periods, users
    
    // Layer 3: Schema-driven components
    { name: "Planning Schemas", fn: seedFormSchemas }, // depends on users (created_by FK)
    { name: "Execution schema", fn: seedExecutionFormSchemas }, // depends on users (created_by FK)
    { name: "Schema Activity Categories", fn: seedSchemaActivityCategories },

    // Layer 4: Execution components (FIXED ORDER)
    { name: "Execution Categories", fn: seedExecutionCategories },
    { name: "Execution Activities", fn: seedExecutionActivities }, // depends on execution categories
    
    // Layer 5: Planning components
    { name: "Planning Activities", fn: seedDynamicActivities }, // depends on planning categories
    
    // Layer 6: Event mappings (MUST come after both planning and execution activities exist)
    { name: "Execution Event Mappings", fn: seedExecutionEventMappings }, // FIXED: Now handles both execution and configurable mappings
    
    // Layer 7: Enhanced statement templates (depends on events and mappings)
    { name: "Enhanced Statement Templates", fn: seedEnhancedStatementTemplates }, // NEW: Enhanced templates for dynamic generation
    
    { name: "Form Fields", fn: formFields }, // depends on form schemas
    
    // Layer 7: Financial reporting components
    { name: "System Configurations", fn: systemConfigurations },

    // Layer 8: Enhanced planning data (depends on users, projects, events)
    { name: "Enhanced Planning Data", fn: seedEnhancedPlanningData },
];

// Optional: Selective seeding functions
async function runSelectiveSeeds() {
    try {
        console.log("Starting selective seeding for specific programs...");
        
        // Seed only HIV program (both planning and execution)
        console.log("Seeding HIV program data...");
        await seedProgramPlanningData(db, 'HIV');
        await seedExecutionDataForProgram(db, 'HIV');
        
        // Seed only TB program
        console.log("Seeding TB program data...");
        await seedProgramPlanningData(db, 'TB');
        await seedExecutionDataForProgram(db, 'TB');
        
        // Seed only Malaria program
        console.log("Seeding Malaria program data...");
        await seedProgramPlanningData(db, 'Malaria');
        await seedExecutionDataForProgram(db, 'MAL');
        
        console.log("Selective seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error during selective seeding:", error);
        process.exit(1);
    }
}

async function runFullSeeds() {
    try {
        const startedAt = Date.now();
        const dbUrl = process.env.DATABASE_URL || "";
        const dbName = dbUrl.split("/").pop()?.split("?")[0] || "unknown";
        const env = process.env.NODE_ENV || "development";

        console.log("Starting full database seeding...");
        console.log(`Database: ${dbName}`);
        console.log(`Environment: ${env}`);
        
        let successCount = 0;
        let failureCount = 0;
        const perTableDelta: Array<{ table: string; inserted: number; total: number }> = [];

        for (const seeder of seeders) {
            console.log(`\n=== Running ${seeder.name} seeder ===`);
            try {
                const tables = seederTables[seeder.name] || [];
                const before = tables.length > 0 ? await countTables(tables) : {};
                
                // Run the seeder
                await seeder.fn(db);
                
                const after = tables.length > 0 ? await countTables(tables) : {};

                for (const t of tables) {
                    const tableName = t.name;
                    const inserted = (after[tableName] ?? 0) - (before[tableName] ?? 0);
                    perTableDelta.push({ table: tableName, inserted, total: after[tableName] ?? 0 });
                }

                console.log(`✅ Completed ${seeder.name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed ${seeder.name}:`, error);
                failureCount++;
                
                // For execution event mappings specifically, provide detailed debugging
                if (seeder.name === "Execution Event Mappings") {
                    console.log("\n=== DEBUGGING EXECUTION EVENT MAPPINGS ===");
                    try {
                        // Check if execution activities exist
                        const executionCount = await db.select({ count: sql<number>`cast(count(*) as int)` })
                            .from(schema.dynamicActivities)
                            .where(sql`module_type = 'execution'`);
                        console.log(`Execution activities in DB: ${executionCount[0]?.count || 0}`);
                        
                        // Check if GOODS_SERVICES event exists
                        const goodsServicesEvent = await db.select({ id: schema.events.id, code: schema.events.code })
                            .from(schema.events)
                            .where(sql`code = 'GOODS_SERVICES'`);
                        console.log(`GOODS_SERVICES event found:`, goodsServicesEvent[0] || "NOT FOUND");
                        
                        // Check current mappings
                        const mappingCount = await db.select({ count: sql<number>`cast(count(*) as int)` })
                            .from(schema.configurableEventMappings);
                        console.log(`Current event mappings: ${mappingCount[0]?.count || 0}`);
                        
                    } catch (debugError) {
                        console.error("Debug query failed:", debugError);
                    }
                    console.log("=== END DEBUG INFO ===\n");
                }
                
                // Continue with other seeders or throw based on your preference
                // Uncomment the next line to stop on first error:
                // throw error;
            }
        }

        // Validation and integrity checks
        await runPostSeedingValidation();

        // Per-table summary output
        if (perTableDelta.length > 0) {
            console.log("\n=== SEEDING SUMMARY ===");
            const grouped: Record<string, { inserted: number; total: number }> = {};
            for (const r of perTableDelta) {
                if (!grouped[r.table]) grouped[r.table] = { inserted: 0, total: r.total };
                grouped[r.table].inserted += r.inserted;
                grouped[r.table].total = r.total; // last total is fine
            }
            for (const [table, stats] of Object.entries(grouped)) {
                const dots = ".".repeat(Math.max(1, 35 - table.length));
                console.log(`${table} ${dots} +${stats.inserted} rows (total ${stats.total})`);
            }
        }

        const tookMs = Date.now() - startedAt;
        const tookSec = (tookMs / 1000).toFixed(2);
        console.log("");
        console.log("=== SEEDING COMPLETED ===");
        console.log(`Success: ${successCount} seeders, Failed: ${failureCount} seeders`);
        console.log(`Total time: ${tookSec}s`);
        
        if (failureCount > 0) {
            console.log("⚠️  Some seeders failed. Check the logs above for details.");
        }
        
        process.exit(failureCount > 0 ? 1 : 0);
    } catch (error) {
        console.error("Error during seeding:", error);
        process.exit(1);
    }
}

async function runPostSeedingValidation() {
    console.log("\n=== POST-SEEDING VALIDATION ===");
    
    try {
        // Check facilities have valid district references
        const [badFacilities] = await db.execute(sql`
            select count(*)::int as cnt 
            from facilities f 
            left join districts d on f.district_id = d.id 
            where d.id is null
        `);
        const invalidFacilityCount = (badFacilities as any)?.cnt ?? 0;
        if (invalidFacilityCount === 0) {
            console.log("✓ All facilities have valid district references");
        } else {
            console.warn(`⚠️  ${invalidFacilityCount} facilities have invalid district references`);
        }
        
        // Check execution activities have valid categories
        const [badActivities] = await db.execute(sql`
            select count(*)::int as cnt 
            from dynamic_activities da 
            left join schema_activity_categories sac on da.category_id = sac.id 
            where sac.id is null and da.module_type = 'execution'
        `);
        const invalidExecCount = (badActivities as any)?.cnt ?? 0;
        if (invalidExecCount === 0) {
            console.log("✓ All execution activities have valid category references");
        } else {
            console.warn(`⚠️  ${invalidExecCount} execution activities have invalid category references`);
        }
        
        // CHECK EXECUTION EVENT MAPPINGS (the main issue we're fixing)
        const [executionMappingCheck] = await db.execute(sql`
            SELECT 
                da.module_type,
                COUNT(*) as activity_count,
                COUNT(cem.id) as mapped_count,
                COUNT(*) - COUNT(cem.id) as unmapped_count
            FROM dynamic_activities da
            LEFT JOIN configurable_event_mappings cem ON da.id = cem.activity_id AND cem.is_active = true
            WHERE da.module_type = 'execution'
            GROUP BY da.module_type
        `);
        
        const execCheck = executionMappingCheck as any;
        if (execCheck) {
            console.log(`📊 Execution Activities: ${execCheck.activity_count} total, ${execCheck.mapped_count} mapped, ${execCheck.unmapped_count} unmapped`);
            
            if (execCheck.unmapped_count > 0) {
                console.log("❌ EXECUTION EVENT MAPPING ISSUE STILL EXISTS!");
                console.log("Attempting to fix now...");
                
                try {
                    await seedExecutionEventMappings(db);
                    console.log("✅ Execution event mappings seeder ran successfully");
                    
                    // Re-check
                    const [recheck] = await db.execute(sql`
                        SELECT COUNT(*) as unmapped_count
                        FROM dynamic_activities da
                        LEFT JOIN configurable_event_mappings cem ON da.id = cem.activity_id AND cem.is_active = true
                        WHERE da.module_type = 'execution' AND cem.id IS NULL
                    `);
                    const recheckResult = (recheck as any)?.unmapped_count ?? 0;
                    
                    if (recheckResult === 0) {
                        console.log("✅ All execution activities now have event mappings!");
                    } else {
                        console.log(`❌ Still ${recheckResult} unmapped execution activities`);
                    }
                } catch (fixError) {
                    console.error("❌ Failed to fix execution event mappings:", fixError);
                }
            } else {
                console.log("✅ All execution activities have event mappings");
            }
        }
        
        // Summary validation query
        const [summary] = await db.execute(sql`
            SELECT 
                'dynamic_activities' as table_name, COUNT(*) as count 
            FROM dynamic_activities
            UNION ALL
            SELECT 'events', COUNT(*) FROM events
            UNION ALL
            SELECT 'configurable_event_mappings', COUNT(*) FROM configurable_event_mappings
            UNION ALL
            SELECT 'schema_activity_categories', COUNT(*) FROM schema_activity_categories
        `);
        
        console.log("\n📊 Final table counts:");
        for (const row of summary as any) {
            console.log(`   ${row.table_name}: ${row.count}`);
        }
        
    } catch (validationError) {
        console.warn("⚠️  Validation checks failed:", validationError);
    }
}

// Advanced: Conditional seeding based on environment or command line args
async function runConditionalSeeds() {
    const args = process.argv.slice(2);
    const seedType = args[0] || 'full';
    const specificProgram = args[1] as 'HIV' | 'MAL' | 'TB' | 'Malaria' | undefined;

    try {
        console.log(`Starting ${seedType} seeding...`);

        switch (seedType) {
            case 'core':
                // Seed only core infrastructure
                const coreSeeds = seeders.slice(0, 5); // Up to projects
                for (const seeder of coreSeeds) {
                    console.log(`Running ${seeder.name} seeder...`);
                    await seeder.fn(db);
                }
                break;

            case 'execution':
                // Seed only execution-related data
                console.log('Running Schema Activity Categories seeder (required for execution activities)...');
                await seedSchemaActivityCategories(db);
                
                if (specificProgram) {
                    const programCode = specificProgram === 'Malaria' ? 'MAL' : specificProgram;
                    console.log(`Seeding execution data for ${programCode}...`);
                    await seedExecutionDataForProgram(db, programCode as 'HIV' | 'MAL' | 'TB');
                    
                    // CRITICAL: Add execution event mappings for the specific program
                    console.log(`Running execution event mappings for ${programCode}...`);
                    await seedExecutionEventMappings(db, programCode as 'HIV' | 'Malaria' | 'TB');
                } else {
                    console.log('Running Execution Categories seeder...');
                    await seedExecutionCategories(db);
                    console.log('Running Execution Activities seeder...');
                    await seedExecutionActivities(db);
                    console.log('Running Execution Event Mappings seeder...');
                }
                break;

            case 'planning':
                // Seed only planning-related data
                if (specificProgram) {
                    const programName = specificProgram === 'MAL' ? 'Malaria' : specificProgram;
                    console.log(`Seeding ${programName} planning data...`);
                    await seedProgramPlanningData(db, programName as 'HIV' | 'Malaria' | 'TB');
                } else {
                    console.log("Seeding all planning data...");
                    await seedEnhancedPlanningData(db);
                }
                break;

            case 'program':
                // Seed both planning and execution for a specific program
                if (!specificProgram) {
                    console.error("Program type required for 'program' seed type. Use: npm run seed program HIV|TB|MAL|Malaria");
                    process.exit(1);
                }
                
                const programCode = specificProgram === 'Malaria' ? 'MAL' : specificProgram;
                const programName = specificProgram === 'MAL' ? 'Malaria' : specificProgram;
                
                console.log(`Seeding complete ${programName} program data (planning + execution)...`);
                
                // Ensure dependencies are met
                await seedSchemaActivityCategories(db);
                
                // Seed planning data
                await seedProgramPlanningData(db, programName as 'HIV' | 'Malaria' | 'TB');
                
                // Seed execution data
                await seedExecutionDataForProgram(db, programCode as 'HIV' | 'MAL' | 'TB');
                
                // CRITICAL: Seed execution event mappings
                await seedExecutionEventMappings(db, programName as 'HIV' | 'Malaria' | 'TB');
                break;

            case 'fix-mappings':
                // Special case: Just fix the execution event mappings
                console.log("Fixing execution event mappings...");
                await seedExecutionEventMappings(db);
                await runPostSeedingValidation();
                break;

            case 'selective':
                await runSelectiveSeeds();
                return;

            case 'full':
            default:
                await runFullSeeds();
                return;
        }

        console.log("Conditional seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error during conditional seeding:", error);
        process.exit(1);
    }
}

// Choose your seeding strategy
// Supports SEED_MODE=fresh|update|force for environment-driven mode
const SEED_MODE = process.env.SEED_MODE as 'fresh' | 'update' | 'force' | undefined;
const SEEDING_MODE = process.env.SEEDING_MODE || 'conditional';

if (SEED_MODE === 'fresh' || SEED_MODE === 'update' || SEED_MODE === 'force') {
    console.log(`Running environment-driven seeding with SEED_MODE=${SEED_MODE}`);
    // Individual seeders may honor SEED_MODE to change conflict behavior
    runFullSeeds();
} else {
    switch (SEEDING_MODE) {
        case 'full':
            runFullSeeds();
            break;
        case 'selective':
            runSelectiveSeeds();
            break;
        case 'conditional':
        default:
            runConditionalSeeds();
            break;
    }
}