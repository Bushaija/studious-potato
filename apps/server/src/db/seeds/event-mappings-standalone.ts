#!/usr/bin/env tsx
/**
 * Standalone Event Mappings Seeder
 * 
 * This script seeds configurable event mappings that link activities to events.
 * When run, it OVERWRITES existing data.
 * 
 * Usage:
 *   pnpm db:seed:event-mapping
 * 
 * Or directly:
 *   tsx --require tsconfig-paths/register apps/server/src/db/seeds/event-mappings-standalone.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';
import { seedExecutionEventMappings } from './modules/configurable-event-mappings';

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
 * Delete existing event mappings to allow overwrite
 */
async function deleteExistingEventMappings() {
  console.log('🗑️  Deleting existing event mappings...');
  
  try {
    const deletedMappings = await db
      .delete(schema.configurableEventMappings)
      .returning({ id: schema.configurableEventMappings.id });
    console.log(`   Deleted ${deletedMappings.length} event mappings`);

    console.log('✅ Existing event mappings deleted successfully\n');
  } catch (error) {
    console.error('❌ Error deleting existing event mappings:', error);
    throw error;
  }
}

/**
 * Validate prerequisites
 */
async function validatePrerequisites() {
  console.log('🔍 Validating prerequisites...');
  
  // Check events exist
  const [eventCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.events);
  
  if (!eventCount?.count || eventCount.count === 0) {
    throw new Error('No events found. Run `pnpm db:seed:events` first.');
  }
  console.log(`   ✓ Found ${eventCount.count} events`);

  // Check execution activities exist
  const [activityCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.dynamicActivities);
  
  if (!activityCount?.count || activityCount.count === 0) {
    throw new Error('No activities found. Run `pnpm db:seed:execution` first.');
  }
  console.log(`   ✓ Found ${activityCount.count} activities`);

  console.log('✅ Prerequisites validated\n');
}

/**
 * Main seeding function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   EVENT MAPPINGS STANDALONE SEEDER                         ║');
  console.log('║   (Overwrites existing data)                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Validate prerequisites
    console.log('📊 Step 1: Validating prerequisites...\n');
    await validatePrerequisites();

    // Step 2: Delete existing event mappings
    console.log('📊 Step 2: Clearing existing event mappings...\n');
    await deleteExistingEventMappings();

    // Step 3: Seed event mappings
    console.log('📊 Step 3: Seeding event mappings...\n');
    const result = await seedExecutionEventMappings(db);

    // Step 4: Summary
    const [mappingsByProject] = await db.execute(sql`
      SELECT 
        da.project_type,
        COUNT(cem.id)::int as mapping_count
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      GROUP BY da.project_type
      ORDER BY da.project_type
    `);

    const [mappingsByEvent] = await db.execute(sql`
      SELECT 
        e.code as event_code,
        COUNT(cem.id)::int as mapping_count
      FROM configurable_event_mappings cem
      JOIN events e ON cem.event_id = e.id
      GROUP BY e.code
      ORDER BY mapping_count DESC
      LIMIT 10
    `);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SEEDING COMPLETED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Total mappings created: ${result.totalMappings}\n`);

    console.log('📋 Mappings by Program:');
    if (Array.isArray(mappingsByProject)) {
      mappingsByProject.forEach((row: any) => {
        console.log(`   • ${row.project_type}: ${row.mapping_count}`);
      });
    }
    console.log('');

    console.log('📋 Top Event Codes (by mapping count):');
    if (Array.isArray(mappingsByEvent)) {
      mappingsByEvent.forEach((row: any) => {
        console.log(`   • ${row.event_code}: ${row.mapping_count}`);
      });
    }
    console.log('');

    console.log('📋 What was seeded:');
    console.log('   • Revenue mappings (Other Incomes, Transfers from SPIU/RBC)');
    console.log('   • Expense mappings (B-section activities → GOODS_SERVICES)');
    console.log('   • Asset mappings (Cash at bank, VAT Receivables)');
    console.log('   • Liability mappings (Payables)');
    console.log('   • Equity mappings (Accumulated Surplus, Prior Year Adjustments)\n');

    // Log validation results
    if (result.validation) {
      if (result.validation.isValid) {
        console.log('✅ All validation checks passed\n');
      } else {
        console.log('⚠️  Validation issues found:');
        result.validation.errors.forEach(err => console.log(`   ❌ ${err}`));
        console.log('');
      }
    }

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
