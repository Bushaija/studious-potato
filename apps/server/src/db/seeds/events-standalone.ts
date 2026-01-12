#!/usr/bin/env tsx
/**
 * Standalone Events Seeder
 * 
 * This script seeds all financial events (revenue, expense, asset, liability, equity).
 * When run, it OVERWRITES existing data.
 * 
 * Usage:
 *   pnpm db:seed:events
 * 
 * Or directly:
 *   tsx --require tsconfig-paths/register apps/server/src/db/seeds/events-standalone.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';
import seedEvents from './modules/events';

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
 * Delete existing events to allow overwrite
 */
async function deleteExistingEvents() {
  console.log('🗑️  Deleting existing events...');
  
  try {
    // First, delete event mappings that reference events
    const deletedMappings = await db
      .delete(schema.configurableEventMappings)
      .returning({ id: schema.configurableEventMappings.id });
    console.log(`   Deleted ${deletedMappings.length} event mappings (dependent data)`);

    // Then delete events
    const deletedEvents = await db
      .delete(schema.events)
      .returning({ id: schema.events.id });
    console.log(`   Deleted ${deletedEvents.length} events`);

    console.log('✅ Existing events deleted successfully\n');
  } catch (error) {
    console.error('❌ Error deleting existing events:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   EVENTS STANDALONE SEEDER                                 ║');
  console.log('║   (Overwrites existing data)                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Delete existing events
    console.log('📊 Step 1: Clearing existing events...\n');
    await deleteExistingEvents();

    // Step 2: Seed events
    console.log('📊 Step 2: Seeding events...\n');
    await seedEvents(db);

    // Step 3: Validation and summary
    console.log('\n🔍 Step 3: Running validation...\n');
    
    const eventsByType = await db
      .select({ 
        eventType: schema.events.eventType,
        count: sql<number>`COUNT(*)::int`
      })
      .from(schema.events)
      .groupBy(schema.events.eventType);

    const [totalCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.events);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SEEDING COMPLETED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('✅ All events have been seeded\n');

    console.log('📋 Summary:');
    console.log(`   • Total events: ${totalCount?.count || 0}`);
    eventsByType.forEach(row => {
      console.log(`   • ${row.eventType}: ${row.count}`);
    });
    console.log('');

    console.log('📋 What was seeded:');
    console.log('   • Revenue events (Tax, Grants, Transfers, etc.)');
    console.log('   • Expense events (Compensation, Goods & Services, etc.)');
    console.log('   • Asset events (Cash, Receivables, Property, etc.)');
    console.log('   • Liability events (Payables, Borrowings, etc.)');
    console.log('   • Equity events (Accumulated Surplus, Prior Year Adjustments)\n');

    console.log('⚠️  Note: Event mappings were also deleted.');
    console.log('   Run `pnpm db:seed:event-mapping` to recreate them.\n');

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
