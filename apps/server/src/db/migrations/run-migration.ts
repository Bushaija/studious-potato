import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = join(__dirname, migrationFile);
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log(`✓ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migrationFile} failed:`, error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the specific migration
const migrationFile = process.argv[2] || "0004_add_dashboard_performance_indexes.sql";

runMigration(migrationFile)
  .then(() => {
    console.log("All migrations completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
