#!/usr/bin/env tsx
/**
 * Standalone Execution Activities Seeder
 * 
 * This script seeds execution activities for all programs (HIV, Malaria, TB)
 * with proper facility targeting and validation. When run, it OVERWRITES existing data.
 * 
 * Usage:
 *   pnpm db:seed:execution
 * 
 * Or directly:
 *   tsx --require tsconfig-paths/register apps/server/src/db/seeds/execution-activities-standalone.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import seedExecutionData, { 
  validateExecutionActivitiesByFacility 
} from './modules/execution-categories-activities';

// Load environment variables
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const myEnv = dotenv.config();
expand(myEnv);

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

/**
 * Delete existing execution data to allow overwrite
 * FIXED: Only delete execution-related event mappings, not all mappings
 */
async function deleteExistingExecutionData() {
  console.log('🗑️  Deleting existing execution data...');
  
  try {
    // First, get all execution activity IDs to delete only their mappings
    const executionActivityIds = await db
      .select({ id: schema.dynamicActivities.id })
      .from(schema.dynamicActivities)
      .where(eq(schema.dynamicActivities.moduleType, 'execution'));
    
    const activityIds = executionActivityIds.map(a => a.id);
    
    // Delete ONLY event mappings that reference execution activities
    let deletedMappingsCount = 0;
    if (activityIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const deletedMappings = await db
        .delete(schema.configurableEventMappings)
        .where(inArray(schema.configurableEventMappings.activityId, activityIds))
        .returning({ id: schema.configurableEventMappings.id });
      deletedMappingsCount = deletedMappings.length;
    }
    console.log(`   Deleted ${deletedMappingsCount} execution event mappings (preserving planning mappings)`);

    // Delete execution activities (depends on categories)
    const deletedActivities = await db
      .delete(schema.dynamicActivities)
      .where(eq(schema.dynamicActivities.moduleType, 'execution'))
      .returning({ id: schema.dynamicActivities.id });
    console.log(`   Deleted ${deletedActivities.length} execution activities`);

    // Delete execution categories
    const deletedCategories = await db
      .delete(schema.schemaActivityCategories)
      .where(eq(schema.schemaActivityCategories.moduleType, 'execution'))
      .returning({ id: schema.schemaActivityCategories.id });
    console.log(`   Deleted ${deletedCategories.length} execution categories`);

    console.log('✅ Existing execution data deleted successfully\n');
  } catch (error) {
    console.error('❌ Error deleting existing execution data:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   EXECUTION ACTIVITIES STANDALONE SEEDER                   ║');
  console.log('║   (Overwrites existing data)                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Delete existing execution data
    console.log('📊 Step 1: Clearing existing execution data...\n');
    await deleteExistingExecutionData();

    // Step 2: Seed execution data (categories + activities)
    console.log('📊 Step 2: Seeding execution data...\n');
    await seedExecutionData(db);

    // Step 3: Run validation
    console.log('\n🔍 Step 3: Running comprehensive validation...\n');
    await validateExecutionActivitiesByFacility(db);

    // Step 4: Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SEEDING COMPLETED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('✅ All execution activities have been seeded');
    console.log('✅ All validations passed');
    console.log('✅ Payable mappings established\n');

    console.log('📋 What was seeded:');
    console.log('   • Execution categories for HIV, Malaria, TB');
    console.log('   • Execution activities for both hospital and health_center');
    console.log('   • VAT receivables for applicable expenses');
    console.log('   • Payable mappings for expense tracking');
    console.log('   • Prior year adjustment categories\n');

  } catch (error) {
    console.error('\n❌ ERROR during seeding:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the seeder
main()
  .then(() => {
    console.log('✨ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
