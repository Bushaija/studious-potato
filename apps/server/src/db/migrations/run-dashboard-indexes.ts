/**
 * Script to run the dashboard performance indexes migration
 * 
 * Usage: tsx src/db/migrations/run-dashboard-indexes.ts
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 Running dashboard performance indexes migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '0004_add_dashboard_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoint and filter out comments and empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract index name from CREATE INDEX statement for logging
      const indexNameMatch = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      const indexName = indexNameMatch ? indexNameMatch[1] : `Statement ${i + 1}`;
      
      console.log(`⏳ Executing: ${indexName}...`);
      
      try {
        await db.execute(sql.raw(statement));
        console.log(`✅ Success: ${indexName}\n`);
      } catch (error: any) {
        // If index already exists, that's okay
        if (error.message?.includes('already exists')) {
          console.log(`ℹ️  Already exists: ${indexName}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Verifying indexes...\n');

    // Verify indexes were created
    const indexNames = [
      'idx_projects_facility_period_active',
      'idx_schema_entries_entity_facility_period',
      'idx_schema_entries_project_entity',
      'idx_schema_entries_approval_status_filtered',
    ];

    const verificationQuery = sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE indexrelname = ANY(${indexNames})
      ORDER BY tablename, indexrelname
    `;

    const result = await db.execute(verificationQuery);
    const rows = Array.from(result);
    
    if (rows.length > 0) {
      console.log('✅ Indexes verified:\n');
      rows.forEach((row: any) => {
        console.log(`   - ${row.indexname} on ${row.tablename} (${row.index_size})`);
      });
      console.log('');
    } else {
      console.log('⚠️  Warning: Could not verify indexes. They may still be created.\n');
    }

    console.log('✨ All done! Dashboard queries should now be faster.\n');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
