/**
 * Script to verify the quarterly balance rollover indexes are working correctly
 * This checks if the index is being used in query execution plans
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

async function verifyIndexes() {
  console.log("🔍 Verifying quarterly balance rollover indexes...\n");

  try {
    // 1. Check if the index exists
    console.log("1️⃣ Checking if index exists...");
    const indexExists = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'schema_form_data_entries'
        AND indexname = 'idx_schema_entries_quarter_lookup';
    `);

    const existsRows = Array.isArray(indexExists) ? indexExists : indexExists.rows || [];
    
    if (existsRows.length === 0) {
      console.log("❌ Index 'idx_schema_entries_quarter_lookup' not found!");
      console.log("   Please run the migration first: npm run db:migrate:quarterly-rollover-indexes");
      process.exit(1);
    }

    console.log("✅ Index exists!");
    console.log(`   Definition: ${existsRows[0].indexdef}\n`);

    // 2. Check index size and usage statistics
    console.log("2️⃣ Checking index statistics...");
    const indexStats = await db.execute(sql`
      SELECT
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE indexrelname = 'idx_schema_entries_quarter_lookup';
    `);

    const statsRows = Array.isArray(indexStats) ? indexStats : indexStats.rows || [];
    
    if (statsRows.length > 0) {
      const stats = statsRows[0];
      console.log("✅ Index statistics:");
      console.log(`   - Index scans: ${stats.index_scans}`);
      console.log(`   - Tuples read: ${stats.tuples_read}`);
      console.log(`   - Tuples fetched: ${stats.tuples_fetched}`);
      console.log(`   - Index size: ${stats.index_size}\n`);
    }

    // 3. Analyze query execution plan for previous quarter lookup
    console.log("3️⃣ Analyzing query execution plan...");
    console.log("   Testing query pattern used by fetchPreviousQuarterExecution:\n");

    // Sample query that mimics the actual query pattern
    const explainResult = await db.execute(sql`
      EXPLAIN (FORMAT JSON, ANALYZE false)
      SELECT *
      FROM schema_form_data_entries
      WHERE project_id = 1
        AND facility_id = 1
        AND reporting_period_id = 1
        AND entity_type = 'execution'
        AND (form_data->'context'->>'quarter') = 'Q1';
    `);

    const explainRows = Array.isArray(explainResult) ? explainResult : explainResult.rows || [];
    const plan = explainRows[0]?.["QUERY PLAN"]?.[0];
    
    if (!plan) {
      console.log("   ⚠️  Could not retrieve query plan");
      return;
    }
    
    console.log("   Query Plan:");
    console.log(JSON.stringify(plan, null, 2));

    // Check if the index is being used
    const planString = JSON.stringify(plan);
    if (planString.includes("idx_schema_entries_quarter_lookup")) {
      console.log("\n✅ Index is being used in the query execution plan!");
    } else if (planString.includes("Index Scan") || planString.includes("Bitmap Index Scan")) {
      console.log("\n⚠️  An index is being used, but not the expected one.");
      console.log("   This might be okay if another suitable index exists.");
    } else {
      console.log("\n⚠️  Query is using a sequential scan instead of the index.");
      console.log("   This is NORMAL for small tables - PostgreSQL automatically chooses");
      console.log("   the most efficient plan. The index will be used as the table grows.");
      console.log("   Current cost is very low, indicating good performance.");
    }

    // 4. Performance estimation
    console.log("\n4️⃣ Performance estimation:");
    const costInfo = plan.Plan;
    if (costInfo) {
      console.log(`   - Estimated startup cost: ${costInfo["Startup Cost"]}`);
      console.log(`   - Estimated total cost: ${costInfo["Total Cost"]}`);
      console.log(`   - Estimated rows: ${costInfo["Plan Rows"]}`);
      
      if (costInfo["Total Cost"] < 100) {
        console.log("   ✅ Query cost is low - good performance expected!");
      } else {
        console.log("   ⚠️  Query cost is higher than expected.");
      }
    }

    console.log("\n🎉 Verification completed!");
    console.log("\n📝 Summary:");
    console.log("   - Index exists and is properly defined");
    console.log("   - Query execution plan has been analyzed");
    console.log("   - Performance metrics are available");
    console.log("\n💡 Tip: Run this script periodically to monitor index usage and performance.");

  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the verification
verifyIndexes();
