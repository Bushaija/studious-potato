// import type { Database } from "@/db";
// import * as schema from "@/db/schema";

// /**
//  * Returns a Map of eventCode -> eventId for quick look-ups while seeding
//  */
// export async function getEventCodeIdMap(db: Database): Promise<Map<string, number>> {
//   const events = await db.select().from(schema.events);
//   return new Map(events.map(e => [e.code, e.id]));
// } 

import type { Database } from "@/db";
import * as schema from "@/db/schema";

/**
 * Creates a map of event codes to their database IDs
 * Used by statement template seeder to resolve event references
 */
export async function getEventCodeIdMap(db: Database): Promise<Map<string, number>> {
  console.log("Building event code to ID map...");
  
  try {
    const events = await db
      .select({ 
        id: schema.events.id, 
        code: schema.events.code 
      })
      .from(schema.events)
      .orderBy(schema.events.code);

    const eventMap = new Map<string, number>();
    
    events.forEach(event => {
      eventMap.set(event.code, event.id);
    });

    console.log(`Created event map with ${eventMap.size} events:`);
    
    // Log available events for debugging
    const sortedEvents = Array.from(eventMap.keys()).sort();
    sortedEvents.forEach(code => {
      console.log(`  ${code} -> ID ${eventMap.get(code)}`);
    });

    return eventMap;
    
  } catch (error) {
    console.error("Failed to build event code map:", error);
    throw new Error(`Event mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates that all required event codes exist in the database
 */
export async function validateEventCodes(db: Database, requiredEventCodes: string[]): Promise<{
  valid: string[];
  missing: string[];
  eventMap: Map<string, number>;
}> {
  const eventMap = await getEventCodeIdMap(db);
  const valid: string[] = [];
  const missing: string[] = [];
  
  requiredEventCodes.forEach(code => {
    if (eventMap.has(code)) {
      valid.push(code);
    } else {
      missing.push(code);
    }
  });
  
  return { valid, missing, eventMap };
}

/**
 * Get all unique event codes used in statement templates
 */
export function getAllEventCodesFromTemplates(): string[] {
  // Import your template data
  const { 
    revenueExpenditureTemplates, 
    assetsAndLiabilitiesTemplates, 
    cashFlowTemplates, 
    changeInNetAssetsTemplate, 
    budgetVsActualAmountsTemplate 
  } = require('../data/statement-templates');
  
  const allTemplates = [
    ...revenueExpenditureTemplates,
    ...assetsAndLiabilitiesTemplates,
    ...cashFlowTemplates,
    ...changeInNetAssetsTemplate,
    ...budgetVsActualAmountsTemplate
  ];
  
  const allEventCodes = new Set<string>();
  
  allTemplates.forEach(template => {
    template.eventCodes?.forEach((code: string) => {
      allEventCodes.add(code);
    });
  });
  
  return Array.from(allEventCodes).sort();
}