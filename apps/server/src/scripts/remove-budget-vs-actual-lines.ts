#!/usr/bin/env tsx

/**
 * Script to remove specific lines from Budget vs Actual template
 * Per accounting department request, removes:
 * - Total non-financial assets
 * - Net lending / borrowing  
 * - Total net incurrence of liabilities
 */

import db from "@/db";
import { statementTemplates } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

async function removeBudgetVsActualLines() {
  console.log("=== Removing Budget vs Actual Lines ===\n");

  try {
    // Lines to remove per accounting request
    const linesToRemove = [
      'TOTAL_NON_FINANCIAL_ASSETS',
      'NET_LENDING_BORROWING', 
      'TOTAL_NET_LIABILITY_INCURRANCE'
    ];

    console.log("Lines to be removed:");
    linesToRemove.forEach(lineCode => {
      console.log(`  - ${lineCode}`);
    });
    console.log();

    // Check if lines exist before removal
    console.log("Checking existing lines...");
    for (const lineCode of linesToRemove) {
      const existing = await db.query.statementTemplates.findFirst({
        where: and(
          eq(statementTemplates.statementCode, 'BUDGET_VS_ACTUAL'),
          eq(statementTemplates.lineCode, lineCode)
        )
      });

      if (existing) {
        console.log(`  ✅ Found: ${lineCode} - "${existing.lineItem}"`);
      } else {
        console.log(`  ⚠️  Not found: ${lineCode}`);
      }
    }

    // Remove the lines
    console.log("\nRemoving lines from database...");
    let removedCount = 0;

    for (const lineCode of linesToRemove) {
      const result = await db
        .delete(statementTemplates)
        .where(and(
          eq(statementTemplates.statementCode, 'BUDGET_VS_ACTUAL'),
          eq(statementTemplates.lineCode, lineCode)
        ));

      if (result.rowCount && result.rowCount > 0) {
        console.log(`  ✅ Removed: ${lineCode}`);
        removedCount++;
      } else {
        console.log(`  ⚠️  No rows affected for: ${lineCode}`);
      }
    }

    // Verify removal
    console.log("\nVerifying removal...");
    const remainingLines = await db
      .select({
        lineCode: statementTemplates.lineCode,
        lineItem: statementTemplates.lineItem,
        displayOrder: statementTemplates.displayOrder
      })
      .from(statementTemplates)
      .where(eq(statementTemplates.statementCode, 'BUDGET_VS_ACTUAL'))
      .orderBy(statementTemplates.displayOrder);

    console.log(`\nRemaining Budget vs Actual template lines (${remainingLines.length}):`);
    remainingLines.forEach(line => {
      console.log(`  ${line.displayOrder}. ${line.lineCode} - "${line.lineItem}"`);
    });

    // Check if any of the removed lines still exist
    const stillExisting = remainingLines.filter(line => 
      linesToRemove.includes(line.lineCode)
    );

    if (stillExisting.length > 0) {
      console.error(`\n❌ Error: Some lines still exist after removal:`);
      stillExisting.forEach(line => {
        console.error(`  - ${line.lineCode}`);
      });
      return false;
    }

    console.log(`\n✅ Successfully removed ${removedCount} lines from Budget vs Actual template`);
    console.log("✅ Budget vs Actual template updated per accounting requirements");
    
    return true;

  } catch (error) {
    console.error("❌ Error removing Budget vs Actual lines:", error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  removeBudgetVsActualLines()
    .then(success => {
      console.log(success ? "\n🎉 Budget vs Actual lines removal completed!" : "\n💥 Budget vs Actual lines removal failed!");
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("💥 Budget vs Actual lines removal script failed:", error);
      process.exit(1);
    });
}

export { removeBudgetVsActualLines };