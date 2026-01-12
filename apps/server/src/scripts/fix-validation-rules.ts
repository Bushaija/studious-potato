#!/usr/bin/env tsx

/**
 * Script to fix malformed validation rules in the database
 * Converts empty objects {} to empty arrays [] for validation rules
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

async function fixValidationRules() {
  console.log("Starting validation rules fix...");

  try {
    // Update all validation_rules that are empty objects {} to empty arrays []
    const result = await db.execute(
      sql`
        UPDATE form_fields 
        SET validation_rules = '[]'::jsonb 
        WHERE validation_rules = '{}'::jsonb 
           OR validation_rules IS NULL
      `
    );

    console.log(`Fixed validation rules update completed`);

    // Verify the fix by checking for any remaining empty objects
    const remainingIssues = await db.execute(
      sql`
        SELECT COUNT(*) as count 
        FROM form_fields 
        WHERE validation_rules = '{}'::jsonb
      `
    );

    const count = Array.isArray(remainingIssues) && remainingIssues.length > 0 
      ? (remainingIssues[0] as any)?.count || 0 
      : 0;
    
    if (count === 0) {
      console.log("✅ All validation rules have been fixed successfully!");
    } else {
      console.log(`⚠️  ${count} records still have malformed validation rules`);
    }

  } catch (error) {
    console.error("❌ Error fixing validation rules:", error);
    process.exit(1);
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixValidationRules()
    .then(() => {
      console.log("Validation rules fix completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to fix validation rules:", error);
      process.exit(1);
    });
}

export { fixValidationRules };