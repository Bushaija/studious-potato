import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

interface EventMappingData {
  projectType: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center";
  activityName?: string;
  categoryCode?: string;
  eventCode: string;
  mappingType: "DIRECT" | "COMPUTED" | "AGGREGATED";
  mappingFormula?: string;
  mappingRatio?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  metadata?: any;
}

// Define execution mappings (revenue/expense activities)
const executionEventMappings: EventMappingData[] = [
  // Revenue mappings (cross-facility)
  { projectType: 'HIV', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  // Expenditure mappings - Transfer to RBC
  { projectType: 'HIV', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },

  // Asset mappings
  { projectType: 'HIV', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'VAT Receivable 1: Communication - All', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'VAT Receivable 2: Maintenance', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'VAT Receivable 3: Fuel', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'VAT Receivable 4: Office supplies', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'VAT Receivable 1: Communication - All', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'VAT Receivable 2: Maintenance', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'VAT Receivable 3: Fuel', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'VAT Receivable 4: Office supplies', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'VAT Receivable 1: Communication - All', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'VAT Receivable 2: Maintenance', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'VAT Receivable 3: Fuel', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'VAT Receivable 4: Office supplies', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  // HIV Payables - All 15 liability activities
  { projectType: 'HIV', activityName: 'Payable 1: Salaries', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 2: Support group meetings', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 3: Conduct census training', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 4: Clinical mentorship', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 5: Annual cordination meeting', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 6: MDT meeting', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 7: Supervision DQA', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 8: Sample transportation', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 9: Home visit', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 10: Outreach for HIV testing', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 11: WAD celebration', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 12: Communication - All', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 13: Maintenance', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 14: Fuel', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 15: Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  // Malaria Payables - All liability activities
  { projectType: 'Malaria', activityName: 'Payable 1: Salaries', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 2: Supervision', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 3: Cordination meetings', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 4: Car Hiring', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 5: Consumable', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 6: Transport & travel', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 12: Communication - All', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 13: Maintenance', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 14: Fuel', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable 15: Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  // TB Payables - All liability activities
  { projectType: 'TB', activityName: 'Payable 1: Salaries', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 2: Mission', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 3: Car hiring', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 4: Transport for reporting', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 12: Communication - All', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 13: Maintenance', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 14: Fuel', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable 15: Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  // Equity mappings
  { projectType: 'HIV', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  
  // Prior Year Adjustments - Granular breakdown (G-01 subcategory)
  { projectType: 'HIV', activityName: 'Cash', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_CASH', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Receivable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  
  // Prior Year Adjustments - Granular breakdown (G-01 subcategory)
  { projectType: 'Malaria', activityName: 'Cash', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_CASH', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Receivable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  
  // Prior Year Adjustments - Granular breakdown (G-01 subcategory)
  { projectType: 'TB', activityName: 'Cash', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_CASH', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Receivable', eventCode: 'PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES', mappingType: 'DIRECT' },
];

/**
 * Validates execution event mappings to ensure correctness
 * Requirements: 4.1, 4.5
 */
async function validateExecutionEventMappings(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalMappings: number;
    byEvent: Record<string, number>;
    totalRowsMapped: number;
    payablesToGoodsServices: number;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const statistics = {
    totalMappings: 0,
    byEvent: {} as Record<string, number>,
    totalRowsMapped: 0,
    payablesToGoodsServices: 0
  };

  try {
    // Subtask 7.1: Check for total rows mapped (Requirements: 1.4, 4.2)
    const totalRowsQuery = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      WHERE da.is_total_row = true
        AND da.module_type = 'execution'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
    `);
    
    const totalRowsCount = (totalRowsQuery as any[])[0]?.count || 0;
    statistics.totalRowsMapped = totalRowsCount;
    
    if (totalRowsCount > 0) {
      errors.push(
        `CRITICAL: ${totalRowsCount} total rows have event mappings. ` +
        `Total rows should never be mapped.`
      );
    }

    // Subtask 7.2: Check for payables not mapped to PAYABLES event (Requirements: 3.5, 4.3)
    const misroutedPayablesQuery = await db.execute(sql`
      SELECT da.id, da.name, e.code as event_code
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      JOIN events e ON cem.event_id = e.id
      WHERE da.name LIKE 'Payable%'
        AND da.module_type = 'execution'
        AND e.code != 'PAYABLES'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
    `);
    
    const misroutedPayables = misroutedPayablesQuery as any[];
    
    if (misroutedPayables.length > 0) {
      misroutedPayables.forEach(payable => {
        errors.push(
          `CRITICAL: Payable activity "${payable.name}" (ID: ${payable.id}) ` +
          `is mapped to ${payable.event_code} instead of PAYABLES`
        );
      });
    }

    // Subtask 7.3: Check for non-B-category activities mapped to GOODS_SERVICES (Requirements: 4.4, 6.5)
    // B-category codes follow pattern: HIV_EXEC_B, HIV_EXEC_B-01, MAL_EXEC_B-02, etc.
    const incorrectGoodsServicesQuery = await db.execute(sql`
      SELECT da.id, da.name, sac.code as category_code
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      JOIN events e ON cem.event_id = e.id
      JOIN schema_activity_categories sac ON da.category_id = sac.id
      WHERE e.code = 'GOODS_SERVICES'
        AND da.module_type = 'execution'
        AND sac.code NOT LIKE '%_B-%'
        AND sac.code NOT LIKE '%_B'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
    `);
    
    const incorrectGoodsServices = incorrectGoodsServicesQuery as any[];
    
    if (incorrectGoodsServices.length > 0) {
      incorrectGoodsServices.forEach(activity => {
        errors.push(
          `ERROR: Non-expense activity "${activity.name}" (ID: ${activity.id}, Category: ${activity.category_code}) ` +
          `is incorrectly mapped to GOODS_SERVICES`
        );
      });
    }

    // Subtask 7.4: Generate mapping statistics (Requirements: 4.1)
    // Count total mappings
    const totalMappingsQuery = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      WHERE da.module_type = 'execution'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
    `);
    
    statistics.totalMappings = (totalMappingsQuery as any[])[0]?.count || 0;

    // Count mappings by event code
    const mappingsByEventQuery = await db.execute(sql`
      SELECT e.code as event_code, COUNT(cem.id)::int as count
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      JOIN events e ON cem.event_id = e.id
      WHERE da.module_type = 'execution'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
      GROUP BY e.code
      ORDER BY e.code
    `);
    
    (mappingsByEventQuery as any[]).forEach(row => {
      statistics.byEvent[row.event_code] = row.count;
    });

    // Count payables to GOODS_SERVICES (should be 0)
    const payablesToGoodsServicesQuery = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      JOIN events e ON cem.event_id = e.id
      WHERE da.name LIKE 'Payable%'
        AND da.module_type = 'execution'
        AND e.code = 'GOODS_SERVICES'
        ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
    `);
    
    statistics.payablesToGoodsServices = (payablesToGoodsServicesQuery as any[])[0]?.count || 0;

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    statistics
  };
}

/**
 * FIXED: Proper execution event mapping that respects activity names
 * and expands cross-facility mappings correctly
 */
export async function seedExecutionEventMappings(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
) {
  console.log(`🔧 FIXED: Seeding execution event mappings${projectType ? ` for ${projectType}` : ''}...`);

  try {
    // Step 1: Get event map
    const events = await db
      .select({ id: schema.events.id, code: schema.events.code })
      .from(schema.events);

    const eventMap = new Map(events.map(e => [e.code, e.id]));

    // Verify critical events exist
    const requiredEvents = ['OTHER_REVENUE', 'TRANSFERS_PUBLIC_ENTITIES', 'GRANTS_TRANSFERS',
      'GOODS_SERVICES', 'CASH_EQUIVALENTS_END', 'ADVANCE_PAYMENTS',
      'PAYABLES', 'ACCUMULATED_SURPLUS_DEFICITS', 'PRIOR_YEAR_ADJUSTMENTS'];

    const missingEvents = requiredEvents.filter(code => !eventMap.has(code));
    if (missingEvents.length > 0) {
      throw new Error(`Missing required events: ${missingEvents.join(', ')}`);
    }

    console.log(`✓ Found ${events.length} events in database`);

    // Step 2: Get all execution activities (excluding total rows)
    // First, get total count including total rows for logging
    const allActivitiesQuery = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.dynamicActivities)
      .where(
        and(
          eq(schema.dynamicActivities.moduleType, 'execution'),
          projectType ? eq(schema.dynamicActivities.projectType, projectType) : sql`1=1`
        )
      );
    
    const totalActivitiesCount = (allActivitiesQuery[0]?.count as number) || 0;

    const activities = await db
      .select({
        id: schema.dynamicActivities.id,
        name: schema.dynamicActivities.name,
        projectType: schema.dynamicActivities.projectType,
        facilityType: schema.dynamicActivities.facilityType,
        categoryId: schema.dynamicActivities.categoryId,
        activityType: schema.dynamicActivities.activityType,
        isTotalRow: schema.dynamicActivities.isTotalRow
      })
      .from(schema.dynamicActivities)
      .where(
        and(
          eq(schema.dynamicActivities.moduleType, 'execution'),
          eq(schema.dynamicActivities.isTotalRow, false),
          projectType ? eq(schema.dynamicActivities.projectType, projectType) : sql`1=1`
        )
      );

    const totalRowsExcluded = totalActivitiesCount - activities.length;
    
    console.log(`✓ Total activities loaded: ${activities.length}`);
    console.log(`✓ Total rows excluded: ${totalRowsExcluded}`);

    // Step 3: Load category information for fallback filtering
    interface CategoryInfo {
      id: number;
      code: string;
      subCategoryCode: string | null;
    }

    const categories = await db
      .select({
        id: schema.schemaActivityCategories.id,
        code: schema.schemaActivityCategories.code,
        subCategoryCode: schema.schemaActivityCategories.subCategoryCode
      })
      .from(schema.schemaActivityCategories)
      .where(eq(schema.schemaActivityCategories.moduleType, 'execution'));

    const categoryMap = new Map<number, CategoryInfo>();
    categories.forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        code: category.code,
        subCategoryCode: category.subCategoryCode
      });
    });

    console.log(`✓ Loaded ${categories.length} category definitions`);

    // Step 4: Build activity lookup by (projectType, name) - case-insensitive and trimmed
    const activityByProjectAndName = new Map<string, typeof activities>();
    activities.forEach(activity => {
      const key = `${activity.projectType}|${activity.name.toLowerCase().trim()}`;
      if (!activityByProjectAndName.has(key)) {
        activityByProjectAndName.set(key, []);
      }
      activityByProjectAndName.get(key)!.push(activity);
    });

    // Step 5: Process mappings with cross-facility expansion
    const mappingRows: Array<{
      eventId: number;
      activityId: number;
      categoryId: number;
      projectType: string;
      facilityType: string | null;
      mappingType: string;
      mappingFormula: string | null;
      mappingRatio: string;
      isActive: boolean;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
      metadata: any;
    }> = [];

    const filterMappings = projectType
      ? executionEventMappings.filter(m => m.projectType === projectType)
      : executionEventMappings;

    console.log(`Processing ${filterMappings.length} mapping definitions...`);

    for (const mapping of filterMappings) {
      const eventId = eventMap.get(mapping.eventCode);
      if (!eventId) {
        console.warn(`⚠ Event ${mapping.eventCode} not found, skipping`);
        continue;
      }

      // Use case-insensitive and trimmed matching for activity names
      const key = `${mapping.projectType}|${mapping.activityName?.toLowerCase().trim()}`;
      const matchingActivities = activityByProjectAndName.get(key) || [];

      if (matchingActivities.length === 0) {
        console.warn(`⚠ No activities found for ${key}`);
        continue;
      }

      // CRITICAL: Expand to both facility types
      for (const activity of matchingActivities) {
        mappingRows.push({
          eventId,
          activityId: activity.id,
          categoryId: activity.categoryId,
          projectType: activity.projectType!,
          facilityType: activity.facilityType,
          mappingType: mapping.mappingType,
          mappingFormula: mapping.mappingFormula || null,
          mappingRatio: mapping.mappingRatio?.toString() || '1.0000',
          isActive: true,
          effectiveFrom: mapping.effectiveFrom || null,
          effectiveTo: mapping.effectiveTo || null,
          metadata: {
            ...mapping.metadata,
            activityName: mapping.activityName,
            eventCode: mapping.eventCode,
            crossFacilityMapping: true,
            createdAt: new Date().toISOString()
          }
        });
      }
    }

    const explicitMappingCount = mappingRows.length;
    console.log(`✓ Explicit mappings created: ${explicitMappingCount}`);

    // Step 5.5: Auto-map VAT receivable activities to ADVANCE_PAYMENTS
    const advancePaymentsEventId = eventMap.get('ADVANCE_PAYMENTS');
    if (advancePaymentsEventId) {
      const vatReceivableActivities = activities.filter(a =>
        a.activityType === 'VAT_RECEIVABLE' && !mappingRows.some(r => r.activityId === a.id)
      );

      vatReceivableActivities.forEach(activity => {
        mappingRows.push({
          eventId: advancePaymentsEventId,
          activityId: activity.id,
          categoryId: activity.categoryId,
          projectType: activity.projectType!,
          facilityType: activity.facilityType,
          mappingType: 'DIRECT',
          mappingFormula: null,
          mappingRatio: '1.0000',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          metadata: {
            autoGenerated: true,
            vatReceivableMapping: true,
            activityName: activity.name,
            createdAt: new Date().toISOString()
          }
        });
      });

      console.log(`✓ Auto-mapped ${vatReceivableActivities.length} VAT receivable activities to ADVANCE_PAYMENTS`);
    }

    // Step 6: Map remaining unmapped activities to GOODS_SERVICES
    const mappedActivityIds = new Set(mappingRows.map(r => r.activityId));
    const unmappedActivities = activities.filter(a => {
      // Already mapped?
      if (mappedActivityIds.has(a.id)) return false;
      
      // Is it a total row?
      if (a.isTotalRow) return false;
      
      // Is it a computed/total activity type?
      if (a.activityType === 'COMPUTED') return false;
      if (a.activityType?.includes('TOTAL')) return false;
      
      // Only map B subcategory expenses to GOODS_SERVICES
      // B-category codes follow pattern: HIV_EXEC_B, HIV_EXEC_B-01, MAL_EXEC_B-02, etc.
      const category = categoryMap.get(a.categoryId);
      if (!category) return false;
      
      // Match codes that contain '_B' or '_B-' (e.g., HIV_EXEC_B, HIV_EXEC_B-01)
      const isBCategory = category.code.includes('_B-') || category.code.endsWith('_B');
      if (!isBCategory) return false;
      
      return true;
    });

    const goodsServicesEventId = eventMap.get('GOODS_SERVICES')!;
    const fallbackMappingCount = unmappedActivities.length;

    console.log(`✓ Fallback mappings created: ${fallbackMappingCount}`);

    for (const activity of unmappedActivities) {
      mappingRows.push({
        eventId: goodsServicesEventId,
        activityId: activity.id,
        categoryId: activity.categoryId,
        projectType: activity.projectType!,
        facilityType: activity.facilityType,
        mappingType: 'DIRECT',
        mappingFormula: null,
        mappingRatio: '1.0000',
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
        metadata: {
          autoGenerated: true,
          fallbackMapping: true,
          activityName: activity.name,
          createdAt: new Date().toISOString()
        }
      });
    }

    // Step 7: Insert with conflict handling
    console.log(`Inserting ${mappingRows.length} total mappings...`);

    const result = await db
      .insert(schema.configurableEventMappings)
      .values(mappingRows as any)
      .onConflictDoUpdate({
        target: [
          schema.configurableEventMappings.eventId,
          schema.configurableEventMappings.activityId,
          schema.configurableEventMappings.categoryId,
          schema.configurableEventMappings.projectType,
          schema.configurableEventMappings.facilityType
        ],
        set: {
          mappingType: sql`EXCLUDED.mapping_type`,
          mappingFormula: sql`EXCLUDED.mapping_formula`,
          mappingRatio: sql`EXCLUDED.mapping_ratio`,
          metadata: sql`EXCLUDED.metadata`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      })
      .returning({ id: schema.configurableEventMappings.id });

    console.log(`✓ Successfully inserted/updated ${result.length} mappings`);

    // Step 8: Run comprehensive validation (Requirements: 4.1, 4.2, 4.3, 4.4, 4.5)
    console.log('\n🔍 Running validation checks...');
    const validationResult = await validateExecutionEventMappings(db, projectType);

    // Enhanced logging output (Requirements: 4.1, 4.5)
    console.log('\n📊 MAPPING STATISTICS:');
    console.log(`  Total activities loaded: ${activities.length}`);
    console.log(`  Total rows excluded: ${totalRowsExcluded}`);
    console.log(`  Explicit mappings created: ${explicitMappingCount}`);
    console.log(`  Fallback mappings created: ${fallbackMappingCount}`);
    console.log(`  Total mappings in database: ${validationResult.statistics.totalMappings}`);
    console.log(`  Total rows mapped (should be 0): ${validationResult.statistics.totalRowsMapped}`);
    console.log(`  Payables to GOODS_SERVICES (should be 0): ${validationResult.statistics.payablesToGoodsServices}`);
    
    console.log('\n📋 MAPPINGS BY EVENT CODE:');
    const sortedEvents = Object.entries(validationResult.statistics.byEvent).sort((a, b) => a[0].localeCompare(b[0]));
    sortedEvents.forEach(([eventCode, count]) => {
      console.log(`  ${eventCode}: ${count}`);
    });

    // Log validation errors if any
    if (validationResult.errors.length > 0) {
      console.error('\n❌ VALIDATION ERRORS:');
      validationResult.errors.forEach(err => console.error(`  - ${err}`));
    } else {
      console.log('\n✅ All validation checks passed!');
    }

    // Log validation warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn('\n⚠️  VALIDATION WARNINGS:');
      validationResult.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    return {
      success: true,
      totalMappings: result.length,
      validation: validationResult
    };

  } catch (error) {
    console.error('❌ Error seeding execution event mappings:', error);
    throw error;
  }
}

export default seedExecutionEventMappings;