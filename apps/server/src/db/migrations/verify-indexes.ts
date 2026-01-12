import postgres from "postgres";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  process.exit(1);
}

async function verifyIndexes() {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  
  try {
    console.log("Verifying dashboard performance indexes...\n");
    
    const indexes = [
      "idx_projects_facility_period_active",
      "idx_schema_entries_entity_facility_period",
      "idx_schema_entries_project_entity",
      "idx_schema_entries_approval_status_filter"
    ];
    
    for (const indexName of indexes) {
      const result = await sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE indexname = ${indexName}
      `;
      
      if (result.length > 0) {
        console.log(`✓ Index '${indexName}' exists`);
        console.log(`  Table: ${result[0].tablename}`);
        console.log(`  Definition: ${result[0].indexdef}`);
        console.log();
      } else {
        console.log(`✗ Index '${indexName}' NOT FOUND`);
        console.log();
      }
    }
    
    // Get index comments
    console.log("Index comments:");
    const comments = await sql`
      SELECT 
        c.relname as index_name,
        pg_catalog.obj_description(c.oid, 'pg_class') as comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'i'
        AND c.relname IN (
          'idx_projects_facility_period_active',
          'idx_schema_entries_entity_facility_period',
          'idx_schema_entries_project_entity',
          'idx_schema_entries_approval_status_filter'
        )
        AND n.nspname = 'public'
    `;
    
    for (const row of comments) {
      console.log(`  ${row.index_name}: ${row.comment || '(no comment)'}`);
    }
    
  } catch (error) {
    console.error("Verification failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifyIndexes()
  .then(() => {
    console.log("\nVerification completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nVerification failed:", error);
    process.exit(1);
  });
