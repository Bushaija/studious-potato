/**
 * Migration Runner for Snapshot and Period Locking Features
 * 
 * This script runs the 0007_add_snapshot_and_period_locking.sql migration
 * and verifies that all tables, indexes, and constraints were created successfully.
 */

import postgres from "postgres";
import dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  process.exit(1);
}

async function runMigration() {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  
  console.log('🚀 Starting migration: Add Snapshot and Period Locking Features\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '0007_add_snapshot_and_period_locking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration SQL executed successfully\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('report_versions', 'period_locks', 'period_lock_audit_log')
      ORDER BY table_name
    `;
    
    console.log(`   Found ${tables.length} new tables:`);
    tables.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Verify columns were added to financial_reports
    console.log('\n🔍 Verifying financial_reports columns...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financial_reports' 
      AND column_name IN ('snapshot_checksum', 'snapshot_timestamp', 'source_data_version', 'is_outdated')
      ORDER BY column_name
    `;
    
    console.log(`   Found ${columns.length} new columns:`);
    columns.forEach((row: any) => {
      console.log(`   ✓ ${row.column_name} (${row.data_type})`);
    });

    // Verify indexes were created
    console.log('\n🔍 Verifying indexes...');
    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND (
        indexname LIKE 'idx_financial_reports_snapshot%' OR
        indexname LIKE 'idx_financial_reports_is_outdated%' OR
        indexname LIKE 'idx_report_versions%' OR
        indexname LIKE 'idx_period_locks%' OR
        indexname LIKE 'idx_period_lock_audit_log%'
      )
      ORDER BY tablename, indexname
    `;
    
    console.log(`   Found ${indexes.length} new indexes:`);
    indexes.forEach((row: any) => {
      console.log(`   ✓ ${row.indexname} on ${row.tablename}`);
    });

    // Verify foreign key constraints
    console.log('\n🔍 Verifying foreign key constraints...');
    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        confrelid::regclass as referenced_table
      FROM pg_constraint 
      WHERE contype = 'f' 
      AND conrelid::regclass::text IN ('report_versions', 'period_locks', 'period_lock_audit_log')
      ORDER BY table_name, constraint_name
    `;
    
    console.log(`   Found ${constraints.length} foreign key constraints:`);
    constraints.forEach((row: any) => {
      console.log(`   ✓ ${row.constraint_name}: ${row.table_name} -> ${row.referenced_table}`);
    });

    // Verify unique constraints
    console.log('\n🔍 Verifying unique constraints...');
    const uniqueConstraints = await sql`
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name
      FROM pg_constraint 
      WHERE contype = 'u' 
      AND conrelid::regclass::text IN ('report_versions', 'period_locks')
      ORDER BY table_name, constraint_name
    `;
    
    console.log(`   Found ${uniqueConstraints.length} unique constraints:`);
    uniqueConstraints.forEach((row: any) => {
      console.log(`   ✓ ${row.constraint_name} on ${row.table_name}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${tables.length} new tables created`);
    console.log(`   - ${columns.length} columns added to financial_reports`);
    console.log(`   - ${indexes.length} indexes created`);
    console.log(`   - ${constraints.length} foreign key constraints added`);
    console.log(`   - ${uniqueConstraints.length} unique constraints added`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };
