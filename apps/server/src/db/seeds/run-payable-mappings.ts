/**
 * Standalone script to run payable mappings
 * Run this with: npx tsx apps/server/src/db/seeds/run-payable-mappings.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import updatePayableMappings from './modules/update-payable-mappings';

async function main() {
  console.log('🚀 Starting payable mappings update...\n');

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  try {
    // Run the mapping script
    await updatePayableMappings(db);
    
    console.log('\n✅ Payable mappings update complete!');
    
    // Verify the mappings
    console.log('\n🔍 Verifying mappings...');
    const result = await db.execute(`
      SELECT COUNT(*) as mapped_count
      FROM dynamic_activities
      WHERE module_type = 'execution'
        AND metadata->>'payableCode' IS NOT NULL
    `);
    
    console.log(`   Mapped activities: ${(result.rows[0] as any).mapped_count}`);
    
  } catch (error) {
    console.error('❌ Error updating payable mappings:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
