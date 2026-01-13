/**
 * Standalone Statement Templates Seeder
 * 
 * This script seeds/updates statement templates independently.
 * Run with: pnpm db:seed:statement-templates
 */

import "dotenv/config";
import { db } from "@/db";
import { statementTemplates } from "@/db/schema";
import { getEventCodeIdMap } from "./utils/get-event-map";
import { 
  assetsAndLiabilitiesTemplates, 
  changeInNetAssetsTemplate, 
  cashFlowTemplates, 
  revenueExpenditureTemplates, 
  TemplateLine, 
  budgetVsActualAmountsTemplate 
} from "./data/statement-templates";

interface StatementSeed {
  statementCode: string;
  statementName: string;
  templates: TemplateLine[];
}

const statements: StatementSeed[] = [
  {
    statementCode: "REV_EXP",
    statementName: "Statement of Revenue and Expenditure",
    templates: revenueExpenditureTemplates,
  },
  {
    statementCode: "ASSETS_LIAB",
    statementName: "Statement of Assets and Liabilities",
    templates: assetsAndLiabilitiesTemplates,
  },
  {
    statementCode: "CASH_FLOW",
    statementName: "Statement of Cash Flow",
    templates: cashFlowTemplates,
  },
  {
    statementCode: "NET_ASSETS_CHANGES",
    statementName: "Statement of Changes in Net Assets",
    templates: changeInNetAssetsTemplate,
  },
  {
    statementCode: "BUDGET_VS_ACTUAL",
    statementName: "Statement of Budget vs Actual",
    templates: budgetVsActualAmountsTemplate,
  },
];

async function main() {
  console.log("🔗 Connecting to database...");
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   STATEMENT TEMPLATES STANDALONE SEEDER                    ║");
  console.log("║   (Updates statement template formulas and configurations) ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  const startTime = Date.now();
  
  try {
    // Get event code to ID mapping
    const eventMap = await getEventCodeIdMap(db);
    
    if (eventMap.size === 0) {
      throw new Error("No events found in database. Please seed events first.");
    }
    
    console.log(`✓ Found ${eventMap.size} events in database`);

    // Step 1: Delete existing statement templates
    console.log("\n📊 Step 1: Clearing existing statement templates...");
    await db.delete(statementTemplates);
    console.log("✅ Existing templates deleted");

    // Step 2: Insert new templates
    console.log("\n📊 Step 2: Inserting statement templates...");
    
    let totalProcessed = 0;
    const unmappedEvents = new Set<string>();

    for (const stmt of statements) {
      console.log(`\nProcessing ${stmt.statementName}...`);

      const rows = stmt.templates.map((tpl) => {
        // Map event codes to IDs
        const eventMappings = tpl.eventCodes && tpl.eventCodes.length > 0 
          ? tpl.eventCodes
              .map((c) => {
                const id = eventMap.get(c);
                if (id === undefined) {
                  unmappedEvents.add(c);
                  return null;
                }
                return id;
              })
              .filter(Boolean)
          : [];

        return {
          statementCode: stmt.statementCode,
          statementName: stmt.statementName,
          lineItem: tpl.lineItem,
          lineCode: tpl.lineCode,
          parentLineId: tpl.parentLineId || null,
          displayOrder: tpl.displayOrder,
          level: tpl.level,
          eventMappings: eventMappings,
          calculationFormula: tpl.calculationFormula || null,
          aggregationMethod: tpl.aggregationMethod || 'SUM',
          isTotalLine: Boolean(tpl.isTotalLine),
          isSubtotalLine: Boolean(tpl.isSubtotalLine),
          displayConditions: {},
          formatRules: tpl.formatRules || {},
          columns: [],
          validationRules: [],
          statementMetadata: {},
          metadata: {
            ...(tpl.metadata || {}),
            templateSource: 'standalone-seeder',
            processedAt: new Date().toISOString()
          },
          isActive: true
        };
      });

      await db.insert(statementTemplates).values(rows);
      totalProcessed += rows.length;
      console.log(`  ✓ Inserted ${rows.length} templates for ${stmt.statementCode}`);
    }

    if (unmappedEvents.size > 0) {
      console.log(`\n⚠️  Unmapped event codes: ${Array.from(unmappedEvents).join(', ')}`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   SEEDING COMPLETED SUCCESSFULLY                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Total templates created: ${totalProcessed}`);
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
