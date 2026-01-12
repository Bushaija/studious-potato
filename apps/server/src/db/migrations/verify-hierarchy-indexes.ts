import postgres from "postgres";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  process.exit(1);
}

async function verifyHierarchyIndexes() {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  
  try {
    console.log("Verifying hierarchy performance indexes...\n");
    
    // Define expected indexes
    const expectedIndexes = [
      {
        name: "idx_users_role_facility_active",
        table: "users",
        description: "Partial index for DAF/DG user lookups by facility and active status"
      },
      {
        name: "idx_financial_reports_facility_status",
        table: "financial_reports",
        description: "Composite index for facility and status filtering"
      },
      {
        name: "idx_facilities_parent_facility_id",
        table: "facilities",
        description: "Index for finding child facilities of a parent hospital"
      },
      {
        name: "idx_facilities_parent",
        table: "facilities",
        description: "Alternative index name for parent facility lookups"
      },
      {
        name: "idx_facilities_district_type",
        table: "facilities",
        description: "Composite index for district-type queries"
      },
      {
        name: "idx_facilities_district_facility_type",
        table: "facilities",
        description: "Alternative composite index for district-type queries"
      }
    ];
    
    // Query to check if indexes exist
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1)
      ORDER BY tablename, indexname;
    `;
    
    const indexNames = expectedIndexes.map(idx => idx.name);
    const existingIndexes = await sql.unsafe(indexQuery, [indexNames]);
    
    console.log("Expected Indexes:");
    console.log("=================\n");
    
    let allFound = true;
    const foundIndexNames = new Set(existingIndexes.map((idx: any) => idx.indexname));
    
    for (const expected of expectedIndexes) {
      const exists = foundIndexNames.has(expected.name);
      const status = exists ? "✓ FOUND" : "✗ MISSING";
      const color = exists ? "\x1b[32m" : "\x1b[31m";
      const reset = "\x1b[0m";
      
      console.log(`${color}${status}${reset} ${expected.name}`);
      console.log(`  Table: ${expected.table}`);
      console.log(`  Description: ${expected.description}`);
      
      if (exists) {
        const indexDef = existingIndexes.find((idx: any) => idx.indexname === expected.name);
        console.log(`  Definition: ${indexDef.indexdef}`);
      }
      
      console.log();
      
      if (!exists) {
        allFound = false;
      }
    }
    
    // Check for facilities indexes - at least one variant should exist
    const facilitiesParentExists = foundIndexNames.has("idx_facilities_parent_facility_id") || 
                                   foundIndexNames.has("idx_facilities_parent");
    const facilitiesDistrictExists = foundIndexNames.has("idx_facilities_district_type") || 
                                     foundIndexNames.has("idx_facilities_district_facility_type");
    
    console.log("\nFacilities Table Index Summary:");
    console.log("================================");
    console.log(`Parent Facility Index: ${facilitiesParentExists ? "✓ FOUND" : "✗ MISSING"}`);
    console.log(`District-Type Index: ${facilitiesDistrictExists ? "✓ FOUND" : "✗ MISSING"}`);
    
    console.log("\n" + "=".repeat(50));
    
    if (allFound || (facilitiesParentExists && facilitiesDistrictExists)) {
      console.log("\x1b[32m✓ All required indexes are present\x1b[0m");
      return true;
    } else {
      console.log("\x1b[31m✗ Some required indexes are missing\x1b[0m");
      console.log("\nTo create missing indexes, run:");
      console.log("  tsx apps/server/src/db/migrations/run-migration.ts 0008_add_hierarchy_performance_indexes.sql");
      return false;
    }
    
  } catch (error) {
    console.error("Error verifying indexes:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run verification
verifyHierarchyIndexes()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
