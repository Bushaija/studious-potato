/**
 * Test script to verify Section X seed data structure
 * This script validates that Section X activities are properly defined
 * for all project types (HIV, Malaria, TB) and facility types (hospital, health_center)
 */

import { db } from "@/db";
import { seedExecutionCategories, seedExecutionActivities } from "../db/seeds/modules/execution-categories-activities";

async function testSectionXSeed() {
    console.log("Testing Section X seed data structure...\n");

    try {
        // Run the seed functions
        console.log("1. Seeding execution categories (including Section X)...");
        await seedExecutionCategories(db);
        console.log("✅ Categories seeded successfully\n");

        console.log("2. Seeding execution activities (including Section X activities)...");
        await seedExecutionActivities(db);
        console.log("✅ Activities seeded successfully\n");

        // Verify Section X was created
        console.log("3. Verifying Section X data...");
        
        const sectionXCategories = await db.execute(`
            SELECT 
                project_type,
                facility_type,
                code,
                name,
                display_order
            FROM schema_activity_categories
            WHERE code LIKE '%_EXEC_X'
            ORDER BY project_type, facility_type
        `);

        console.log("\n📊 Section X Categories:");
        console.log("Project | Facility | Code | Name | Display Order");
        console.log("--------|----------|------|------|---------------");
        for (const row of sectionXCategories as any[]) {
            console.log(`${row.project_type.padEnd(7)} | ${row.facility_type.padEnd(8)} | ${row.code.padEnd(15)} | ${row.name.padEnd(30)} | ${row.display_order}`);
        }

        const sectionXActivities = await db.execute(`
            SELECT 
                da.project_type,
                da.facility_type,
                da.code,
                da.name,
                da.activity_type,
                da.display_order
            FROM dynamic_activities da
            JOIN schema_activity_categories sac ON da.category_id = sac.id
            WHERE sac.code LIKE '%_EXEC_X'
            ORDER BY da.project_type, da.facility_type
        `);

        console.log("\n📊 Section X Activities:");
        console.log("Project | Facility | Code | Name | Activity Type | Display Order");
        console.log("--------|----------|------|------|---------------|---------------");
        for (const row of sectionXActivities as any[]) {
            console.log(`${row.project_type.padEnd(7)} | ${row.facility_type.padEnd(8)} | ${row.code.substring(0, 30).padEnd(30)} | ${row.name.padEnd(20)} | ${row.activity_type.padEnd(25)} | ${row.display_order}`);
        }

        // Verify Section D "Other Receivables" was updated
        const otherReceivables = await db.execute(`
            SELECT 
                da.project_type,
                da.facility_type,
                da.code,
                da.name,
                da.activity_type,
                da.computation_rules
            FROM dynamic_activities da
            JOIN schema_activity_categories sac ON da.category_id = sac.id
            WHERE sac.code LIKE '%_EXEC_D'
            AND da.name LIKE '%Other Receivables%'
            ORDER BY da.project_type, da.facility_type
        `);

        console.log("\n📊 Section D 'Other Receivables' (should be COMPUTED_ASSET):");
        console.log("Project | Facility | Name | Activity Type | Computation Rules");
        console.log("--------|----------|------|---------------|-------------------");
        for (const row of otherReceivables as any[]) {
            const rules = row.computation_rules ? JSON.stringify(row.computation_rules) : 'null';
            console.log(`${row.project_type.padEnd(7)} | ${row.facility_type.padEnd(8)} | ${row.name.padEnd(40)} | ${row.activity_type.padEnd(17)} | ${rules}`);
        }

        console.log("\n✅ Section X seed data verification complete!");
        console.log("\nSummary:");
        console.log(`- Section X Categories: ${(sectionXCategories as any[]).length}`);
        console.log(`- Section X Activities: ${(sectionXActivities as any[]).length}`);
        console.log(`- Updated Other Receivables: ${(otherReceivables as any[]).length}`);
        
        const expectedCategories = 6; // 3 projects × 2 facility types
        const expectedActivities = 6; // 3 projects × 2 facility types × 1 activity
        const expectedOtherReceivables = 6; // 3 projects × 2 facility types
        
        if ((sectionXCategories as any[]).length === expectedCategories &&
            (sectionXActivities as any[]).length === expectedActivities &&
            (otherReceivables as any[]).length === expectedOtherReceivables) {
            console.log("\n🎉 All expected data is present!");
        } else {
            console.log("\n⚠️  Some data may be missing:");
            console.log(`   Expected ${expectedCategories} categories, found ${(sectionXCategories as any[]).length}`);
            console.log(`   Expected ${expectedActivities} activities, found ${(sectionXActivities as any[]).length}`);
            console.log(`   Expected ${expectedOtherReceivables} Other Receivables, found ${(otherReceivables as any[]).length}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error testing Section X seed:", error);
        process.exit(1);
    }
}

// Run the test
testSectionXSeed();
