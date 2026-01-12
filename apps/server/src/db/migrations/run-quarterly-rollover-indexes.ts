/**
 * Script to run the quarterly balance rollover indexes migration
 * This adds a composite index for efficient previous quarter lookup
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigration() {
  console.log("🚀 Starting quarterly balance rollover indexes migration...");

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "0012_add_quarterly_balance_rollover_indexes.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute the migration
    console.log("📝 Executing migration SQL...");
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");
    console.log("\n📊 Verifying index creation...");

    // Verify the index was created
    const indexCheck = await db.execute(sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'schema_form_data_entries'
        AND indexname = 'idx_schema_entries_quarter_lookup';
    `);

    const rows = Array.isArray(indexCheck) ? indexCheck : indexCheck.rows || [];
    
    if (rows.length > 0) {
      console.log("✅ Index 'idx_schema_entries_quarter_lookup' created successfully!");
      console.log("\nIndex definition:");
      console.log(rows[0].indexdef);
    } else {
      console.log("⚠️  Warning: Index not found after migration");
    }

    console.log("\n🎉 Migration process completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
runMigration();
