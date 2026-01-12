import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { getEventCodeIdMap, validateEventCodes, getAllEventCodesFromTemplates } from "../utils/get-event-map";
import { 
  assetsAndLiabilitiesTemplates, 
  changeInNetAssetsTemplate, 
  cashFlowTemplates, 
  revenueExpenditureTemplates, 
  TemplateLine, 
  budgetVsActualAmountsTemplate 
} from "../data/statement-templates";
import { sql } from "drizzle-orm";

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

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding statement_templates...");

  try {
    // Get event code to ID mapping
    const eventMap = await getEventCodeIdMap(db);
    
    if (eventMap.size === 0) {
      throw new Error("No events found in database. Please seed events first.");
    }

    let totalProcessed = 0;
    const unmappedEvents = new Set<string>();

    for (const stmt of statements) {
      console.log(`Processing ${stmt.statementName}...`);

      try {
        const rows = stmt.templates.map((tpl) => {
          // Map event codes to IDs - CRITICAL FIX: Never allow null
          const eventMappings = tpl.eventCodes && tpl.eventCodes.length > 0 
            ? tpl.eventCodes
                .map((c) => {
                  const id = eventMap.get(c);
                  if (id === undefined) {
                    unmappedEvents.add(c);
                    console.warn(`Event code ${c} not found in DB (line: ${tpl.lineItem})`);
                    return null;
                  }
                  return id;
                })
                .filter(Boolean) // Remove null values
            : []; // CRITICAL: Always return empty array, never null

          return {
            // Core required fields
            statementCode: stmt.statementCode,
            statementName: stmt.statementName,
            lineItem: tpl.lineItem,
            lineCode: tpl.lineCode,
            parentLineId: tpl.parentLineId || null,
            displayOrder: tpl.displayOrder,
            level: tpl.level,
            
            // CRITICAL FIX: eventMappings must be array, never null
            eventMappings: eventMappings, // This is always an array now
            
            // Calculation fields
            calculationFormula: tpl.calculationFormula || null,
            aggregationMethod: tpl.aggregationMethod || 'SUM',
            
            // Boolean flags
            isTotalLine: Boolean(tpl.isTotalLine),
            isSubtotalLine: Boolean(tpl.isSubtotalLine),
            
            // JSON fields with safe defaults
            displayConditions: {}, // Always empty object
            formatRules: tpl.formatRules || {}, // Object or empty object
            columns: [], // Always empty array
            validationRules: [], // Always empty array  
            statementMetadata: {}, // Always empty object
            metadata: {
              ...(tpl.metadata || {}),
              templateSource: 'seeder',
              processedAt: new Date().toISOString()
            },
            
            isActive: true
          };
        });

        console.log(`Prepared ${rows.length} rows for ${stmt.statementCode}`);
        
        // Debug: Check first few rows for null values
        rows.slice(0, 2).forEach((row, index) => {
          console.log(`Row ${index + 1} eventMappings:`, row.eventMappings, `(type: ${typeof row.eventMappings})`);
          if (row.eventMappings === null || row.eventMappings === undefined) {
            console.error(`CRITICAL: Row ${index + 1} has null/undefined eventMappings!`);
          }
        });

        // Direct insertion without SeedManager to avoid its bugs
        try {
          const insertResult = await db
            .insert(schema.statementTemplates)
            .values(rows)
            .onConflictDoUpdate({
              target: [schema.statementTemplates.statementCode, schema.statementTemplates.lineCode],
              set: {
                statementName: sql`EXCLUDED.statement_name`,
                lineItem: sql`EXCLUDED.line_item`,
                parentLineId: sql`EXCLUDED.parent_line_id`,
                displayOrder: sql`EXCLUDED.display_order`,
                level: sql`EXCLUDED.level`,
                eventMappings: sql`EXCLUDED.event_mappings`,
                calculationFormula: sql`EXCLUDED.calculation_formula`,
                aggregationMethod: sql`EXCLUDED.aggregation_method`,
                isTotalLine: sql`EXCLUDED.is_total_line`,
                isSubtotalLine: sql`EXCLUDED.is_subtotal_line`,
                displayConditions: sql`EXCLUDED.display_conditions`,
                formatRules: sql`EXCLUDED.format_rules`,
                columns: sql`EXCLUDED.columns`,
                validationRules: sql`EXCLUDED.validation_rules`,
                statementMetadata: sql`EXCLUDED.statement_metadata`,
                metadata: sql`EXCLUDED.metadata`,
                updatedAt: sql`CURRENT_TIMESTAMP`
              }
            })
            .returning({ id: schema.statementTemplates.id });

          totalProcessed += rows.length;
          console.log(`Successfully processed ${insertResult.length} templates for ${stmt.statementCode}`);

        } catch (insertError) {
          console.error(`Failed to insert ${stmt.statementCode} templates:`, insertError);
          
          // Try inserting one by one to identify problematic rows
          console.log("Attempting individual row insertion for debugging...");
          let successCount = 0;
          
          for (let i = 0; i < rows.length; i++) {
            try {
              await db
                .insert(schema.statementTemplates)
                .values([rows[i]])
                .onConflictDoNothing();
              successCount++;
            } catch (rowError) {
              console.error(`Row ${i + 1} failed:`, rowError);
              console.error(`Problematic row data:`, JSON.stringify(rows[i], null, 2));
            }
          }
          
          console.log(`Individual insertion: ${successCount}/${rows.length} rows succeeded`);
          // Continue processing other statement types instead of throwing
          console.warn(`⚠️  Skipping ${stmt.statementCode} due to insertion errors, continuing with next statement type...`);
        }
      } catch (error) {
        console.error(`Error processing ${stmt.statementCode}:`, error);
        console.warn(`⚠️  Skipping ${stmt.statementCode} due to processing errors, continuing with next statement type...`);
      }
    }

    // Final verification
    const finalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.statementTemplates);
    
    console.log(`Successfully processed ${totalProcessed} statement templates`);
    console.log(`Total templates in database: ${finalCount[0]?.count || 0}`);
    
    if (unmappedEvents.size > 0) {
      const list = Array.from(unmappedEvents).join(', ');
      console.error(`Unmapped event codes found: ${list}`);
      throw new Error(`Seeding aborted: unmapped event codes [${list}] — please seed events or fix template codes.`);
    }

    console.log("Statement_templates seeding completed with all event codes resolved to IDs.");

  } catch (error) {
    console.error("Statement templates seeding failed:", error);
    throw error;
  }
}

// Export individual functions for testing and flexibility
export { 
  statements as statementDefinitions,
  getEventCodeIdMap,
  validateEventCodes,
  getAllEventCodesFromTemplates
};