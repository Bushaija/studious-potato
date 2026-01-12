#!/usr/bin/env tsx
/**
 * Standalone Planning Activities Seeder
 * 
 * This script seeds planning activities for all programs (HIV, Malaria, TB)
 * with proper facility targeting. When run, it OVERWRITES existing data.
 * 
 * Usage:
 *   pnpm db:seed:planning
 * 
 * Or directly:
 *   tsx --require tsconfig-paths/register apps/server/src/db/seeds/planning-activities-standalone.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { 
  seedFormSchemas,
  seedSchemaActivityCategories,
  seedDynamicActivities
} from './modules/planning-activities';

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
 * Delete existing planning data to allow overwrite
 */
async function deleteExistingPlanningData() {
  console.log('🗑️  Deleting existing planning data...');
  
  try {
    // Delete planning activities first (depends on categories)
    const deletedActivities = await db
      .delete(schema.dynamicActivities)
      .where(eq(schema.dynamicActivities.moduleType, 'planning'))
      .returning({ id: schema.dynamicActivities.id });
    console.log(`   Deleted ${deletedActivities.length} planning activities`);

    // Delete planning categories
    const deletedCategories = await db
      .delete(schema.schemaActivityCategories)
      .where(eq(schema.schemaActivityCategories.moduleType, 'planning'))
      .returning({ id: schema.schemaActivityCategories.id });
    console.log(`   Deleted ${deletedCategories.length} planning categories`);

    // Delete planning form schemas
    const deletedSchemas = await db
      .delete(schema.formSchemas)
      .where(eq(schema.formSchemas.moduleType, 'planning'))
      .returning({ id: schema.formSchemas.id });
    console.log(`   Deleted ${deletedSchemas.length} planning form schemas`);

    console.log('✅ Existing planning data deleted successfully\n');
  } catch (error) {
    console.error('❌ Error deleting existing planning data:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   PLANNING ACTIVITIES STANDALONE SEEDER                    ║');
  console.log('║   (Overwrites existing data)                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Delete existing planning data
    console.log('📊 Step 1: Clearing existing planning data...\n');
    await deleteExistingPlanningData();

    // Step 2: Seed form schemas
    console.log('📊 Step 2: Seeding planning form schemas...\n');
    await seedFormSchemas(db);

    // Step 3: Seed activity categories
    console.log('\n📊 Step 3: Seeding planning activity categories...\n');
    await seedSchemaActivityCategories(db);

    // Step 4: Seed dynamic activities
    console.log('\n📊 Step 4: Seeding planning dynamic activities...\n');
    await seedDynamicActivities(db);

    // Step 5: Validation and summary
    console.log('\n🔍 Step 5: Running validation...\n');
    
    const [schemaCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.formSchemas)
      .where(eq(schema.formSchemas.moduleType, 'planning'));
    
    const [categoryCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.schemaActivityCategories)
      .where(eq(schema.schemaActivityCategories.moduleType, 'planning'));
    
    const [activityCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.dynamicActivities)
      .where(eq(schema.dynamicActivities.moduleType, 'planning'));

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SEEDING COMPLETED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('✅ All planning data has been seeded\n');

    console.log('📋 Summary:');
    console.log(`   • Form schemas: ${schemaCount?.count || 0}`);
    console.log(`   • Activity categories: ${categoryCount?.count || 0}`);
    console.log(`   • Dynamic activities: ${activityCount?.count || 0}\n`);

    console.log('📋 What was seeded:');
    console.log('   • Planning form schemas for HIV, Malaria, TB');
    console.log('   • Planning categories for both hospital and health_center');
    console.log('   • Planning activities for all programs\n');

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
