/**
 * Data Aggregation Engine Foundation
 * Handles collecting and aggregating event data from planning and execution sources
 */

import { Database } from "@/db";
import { 
  events, 
  configurableEventMappings, 
  schemaFormDataEntries,
  reportingPeriods,
  facilities,
  projects,
  dynamicActivities
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { 
  EventDataProcessor,
  DataFilters,
  EventAggregation,
  AggregationMetadata,
  PeriodComparison,
  VarianceCalculation,
  DataCollectionError
} from "../types/engine.types";
import {
  EventEntry,
  EventDataCollection,
  CollectionMetadata,
  EventType
} from "../types/core.types";
import { VarianceCalculator } from "../utils/variance-calculator";

export class DataAggregationEngine implements EventDataProcessor {
  constructor(private db: Database) {}

  /**
   * Collect event data based on filters and event codes
   */
  async collectEventData(
    filters: DataFilters,
    eventCodes: string[]
  ): Promise<EventDataCollection> {
    try {
      // Get current and previous period data
      const [currentPeriodData, previousPeriodData] = await Promise.all([
        this.collectPeriodData(filters, eventCodes, 'current'),
        this.collectPeriodData(filters, eventCodes, 'previous')
      ]);

      // Get facilities included in the data collection
      const facilitiesIncluded = await this.getFacilitiesIncluded(filters, currentPeriodData, previousPeriodData);

      const metadata: CollectionMetadata = {
        totalEvents: currentPeriodData.length + previousPeriodData.length,
        facilitiesIncluded,
        periodsIncluded: [filters.reportingPeriodId],
        dataSources: filters.entityTypes,
        collectionTimestamp: new Date()
      };

      return {
        currentPeriod: currentPeriodData,
        previousPeriod: previousPeriodData,
        metadata
      };

    } catch (error) {
      const dataError: DataCollectionError = {
        code: 'DATA_COLLECTION_ERROR',
        message: 'Failed to collect event data',
        context: { filters, eventCodes },
        timestamp: new Date(),
        severity: 'error',
        filters,
        eventCodes,
        missingEvents: []
      };

      console.error('Data collection error:', dataError);
      throw error;
    }
  }

  /**
   * Aggregate event data by event codes, facilities, and periods
   */
  async aggregateByEvent(eventData: EventDataCollection): Promise<EventAggregation> {
    const startTime = Date.now();
    
    const eventTotals = new Map<string, number>();
    const facilityTotals = new Map<number, number>();
    const periodTotals = new Map<number, number>();

    // Aggregate current period data
    for (const entry of eventData.currentPeriod) {
      // Event totals
      const currentEventTotal = eventTotals.get(entry.eventCode) || 0;
      eventTotals.set(entry.eventCode, currentEventTotal + entry.amount);

      // Facility totals
      const currentFacilityTotal = facilityTotals.get(entry.facilityId) || 0;
      facilityTotals.set(entry.facilityId, currentFacilityTotal + entry.amount);

      // Period totals
      const currentPeriodTotal = periodTotals.get(entry.reportingPeriodId) || 0;
      periodTotals.set(entry.reportingPeriodId, currentPeriodTotal + entry.amount);
    }

    const processingTime = Date.now() - startTime;
    const totalAmount = Array.from(eventTotals.values()).reduce((sum, amount) => sum + amount, 0);

    const metadata: AggregationMetadata = {
      totalEvents: eventData.currentPeriod.length,
      totalFacilities: facilityTotals.size,
      totalAmount,
      aggregationMethod: 'SUM',
      processingTime
    };

    return {
      eventTotals,
      facilityTotals,
      periodTotals,
      metadata
    };
  }

  /**
   * Calculate period comparisons and variances
   */
  calculatePeriodComparisons(
    currentPeriod: EventAggregation,
    previousPeriod: EventAggregation
  ): PeriodComparison {
    // Use the VarianceCalculator for consistent variance calculations
    const variances = VarianceCalculator.calculateBatchVariances(
      currentPeriod.eventTotals,
      previousPeriod.eventTotals
    );

    return {
      currentPeriod,
      previousPeriod,
      variances
    };
  }

  /**
   * Get event data summary for specific filters
   */
  async getEventDataSummary(filters: DataFilters): Promise<{
    totalEvents: number;
    totalAmount: number;
    eventBreakdown: Record<string, number>;
    facilityBreakdown: Record<string, number>;
  }> {
    try {
      // Build the query to get aggregated data
      const query = this.db
        .select({
          eventCode: events.code,
          facilityId: schemaFormDataEntries.facilityId,
          totalAmount: sql<number>`COALESCE(SUM(CAST(form_data->>'amount' AS NUMERIC)), 0)`,
          eventCount: sql<number>`COUNT(*)`
        })
        .from(schemaFormDataEntries)
        .innerJoin(configurableEventMappings, 
          eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
        .innerJoin(events, 
          eq(configurableEventMappings.eventId, events.id))
        .where(and(
          eq(schemaFormDataEntries.projectId, filters.projectId),
          filters.facilityId ? eq(schemaFormDataEntries.facilityId, filters.facilityId) : undefined,
          eq(schemaFormDataEntries.reportingPeriodId, filters.reportingPeriodId),
          inArray(schemaFormDataEntries.entityType, filters.entityTypes)
        ))
        .groupBy(events.code, schemaFormDataEntries.facilityId);

      const results = await query;

      // Aggregate results
      const eventBreakdown: Record<string, number> = {};
      const facilityBreakdown: Record<string, number> = {};
      let totalAmount = 0;
      let totalEvents = 0;

      for (const result of results) {
        eventBreakdown[result.eventCode] = (eventBreakdown[result.eventCode] || 0) + result.totalAmount;
        facilityBreakdown[result.facilityId.toString()] = (facilityBreakdown[result.facilityId.toString()] || 0) + result.totalAmount;
        totalAmount += result.totalAmount;
        totalEvents += result.eventCount;
      }

      return {
        totalEvents,
        totalAmount,
        eventBreakdown,
        facilityBreakdown
      };

    } catch (error) {
      console.error('Error getting event data summary:', error);
      return {
        totalEvents: 0,
        totalAmount: 0,
        eventBreakdown: {},
        facilityBreakdown: {}
      };
    }
  }

  // Private helper methods

  private async collectPeriodData(
    filters: DataFilters,
    eventCodes: string[],
    periodType: 'current' | 'previous'
  ): Promise<EventEntry[]> {
    try {
      let targetPeriodId: number = filters.reportingPeriodId;

      // If collecting previous period data, find the previous period
      if (periodType === 'previous') {
        const previousPeriodId = await this.getPreviousPeriodId(filters.reportingPeriodId);
        if (!previousPeriodId) {
          console.log(`[collectPeriodData] No previous period found for period ${filters.reportingPeriodId}`);
          return []; // No previous period found, return empty array
        }
        targetPeriodId = previousPeriodId;
      }

      // Handle both event codes (strings) and event IDs (numbers)
      const eventIds: number[] = [];
      const eventCodeStrings: string[] = [];
      
      for (const eventCode of eventCodes) {
        const numericId = parseInt(eventCode);
        if (!isNaN(numericId)) {
          // It's a numeric ID
          eventIds.push(numericId);
        } else {
          // It's a string code
          eventCodeStrings.push(eventCode);
        }
      }

      // Build event filter condition
      let eventFilter;
      if (eventIds.length > 0 && eventCodeStrings.length > 0) {
        // Both IDs and codes provided
        eventFilter = sql`(${events.id} = ANY(${eventIds}) OR ${events.code} = ANY(${eventCodeStrings}))`;
      } else if (eventIds.length > 0) {
        // Only IDs provided
        eventFilter = inArray(events.id, eventIds);
      } else if (eventCodeStrings.length > 0) {
        // Only codes provided
        eventFilter = inArray(events.code, eventCodeStrings);
      } else {
        // No event filter
        eventFilter = undefined;
      }

      // First, try the traditional approach (entity_id based)
      const traditionalResults = await this.collectTraditionalData(
        filters, targetPeriodId, eventFilter
      );

      // If no traditional data found, try the quarterly JSON approach
      if (traditionalResults.length === 0) {
        console.log(`No traditional data found for period ${targetPeriodId}, trying quarterly JSON approach...`);
        return await this.collectQuarterlyJsonData(
          filters, targetPeriodId, eventFilter
        );
      }

      return traditionalResults;

    } catch (error) {
      console.error(`Error collecting ${periodType} period data:`, error);
      return [];
    }
  }

  /**
   * Collect data using traditional entity_id approach
   * Optimized for single-facility queries (Requirement 8.1, 8.2, 8.3)
   */
  private async collectTraditionalData(
    filters: DataFilters,
    targetPeriodId: number,
    eventFilter: any
  ): Promise<EventEntry[]> {
    const queryStartTime = Date.now();

    // Build facility filter condition - optimize for single facility vs multiple facilities
    let facilityFilter;
    let facilityFilterType: 'single' | 'multiple' | 'none' = 'none';
    
    if (filters.facilityIds && filters.facilityIds.length > 0) {
      // Use facilityIds array if provided (supports aggregation levels)
      if (filters.facilityIds.length === 1) {
        // Single facility: Use = operator for better index utilization (Requirement 8.1, 8.2)
        facilityFilter = eq(schemaFormDataEntries.facilityId, filters.facilityIds[0]);
        facilityFilterType = 'single';
        console.log(`[collectTraditionalData] Using SINGLE facility filter (= operator) for facility ID: ${filters.facilityIds[0]}`);
      } else {
        // Multiple facilities: Use IN clause (Requirement 8.3)
        facilityFilter = inArray(schemaFormDataEntries.facilityId, filters.facilityIds);
        facilityFilterType = 'multiple';
        console.log(`[collectTraditionalData] Using MULTIPLE facility filter (IN clause) for ${filters.facilityIds.length} facilities: [${filters.facilityIds.join(', ')}]`);
      }
    } else if (filters.facilityId) {
      // Backward compatibility: single facilityId field
      facilityFilter = eq(schemaFormDataEntries.facilityId, filters.facilityId);
      facilityFilterType = 'single';
      console.log(`[collectTraditionalData] Using SINGLE facility filter (= operator, backward compat) for facility ID: ${filters.facilityId}`);
    } else {
      // No facility filter
      facilityFilter = undefined;
      facilityFilterType = 'none';
      console.log(`[collectTraditionalData] No facility filter applied`);
    }

    const query = this.db
      .select({
        eventCode: events.code,
        facilityId: schemaFormDataEntries.facilityId,
        amount: sql<number>`COALESCE(CAST(form_data->>'amount' AS NUMERIC), 0)`,
        entityType: schemaFormDataEntries.entityType,
        reportingPeriodId: schemaFormDataEntries.reportingPeriodId
      })
      .from(schemaFormDataEntries)
      .innerJoin(configurableEventMappings, 
        eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
      .innerJoin(events, 
        eq(configurableEventMappings.eventId, events.id))
      .where(and(
        eq(schemaFormDataEntries.projectId, filters.projectId),
        facilityFilter, // Use optimized facility filter
        eq(schemaFormDataEntries.reportingPeriodId, targetPeriodId),
        inArray(schemaFormDataEntries.entityType, filters.entityTypes),
        eventFilter,
        sql`${schemaFormDataEntries.entityId} IS NOT NULL` // Only traditional data
      ));

    const results = await query;
    
    const queryExecutionTime = Date.now() - queryStartTime;
    

    
    // Log aggregation details for multiple facilities (Requirements 2.1, 2.2, 2.3, 4.2, 4.3)
    if (facilityFilterType === 'multiple' && results.length > 0) {
      const facilitiesWithData = new Set(results.map(r => r.facilityId));
      const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
      console.log(`[Data Aggregation] Multiple facility aggregation summary:`);
      console.log(`  - Facilities queried: ${filters.facilityIds?.length || 0}`);
      console.log(`  - Facilities with data: ${facilitiesWithData.size}`);
      console.log(`  - Total records: ${results.length}`);
      console.log(`  - Total amount: ${totalAmount}`);
      console.log(`  - Facility IDs with data: [${Array.from(facilitiesWithData).join(', ')}]`);
    }

    return results.map(result => ({
      eventCode: result.eventCode,
      facilityId: result.facilityId,
      amount: result.amount,
      entityType: result.entityType as EventType,
      reportingPeriodId: result.reportingPeriodId || targetPeriodId
    }));
  }

  /**
   * Collect data using quarterly JSON approach with dual structure detection
   */
  private async collectQuarterlyJsonData(
    filters: DataFilters,
    targetPeriodId: number,
    eventFilter: any
  ): Promise<EventEntry[]> {
    try {
      const queryStartTime = Date.now();
      
      // Use the project ID from filters (already validated in the handler)
      const projectId = filters.projectId;

      console.log(`[CollectQuarterlyJSON] Project: ${projectId}, Period: ${targetPeriodId}, Types: ${filters.entityTypes.join(',')}`)

      // Build facility filter condition - optimize for single facility vs multiple facilities
      let facilityFilter;
      let facilityFilterType: 'single' | 'multiple' | 'none' = 'none';
      
      if (filters.facilityIds && filters.facilityIds.length > 0) {
        if (filters.facilityIds.length === 1) {
          // Single facility: Use = operator for better index utilization (Requirement 8.1, 8.2)
          facilityFilter = eq(schemaFormDataEntries.facilityId, filters.facilityIds[0]);
          facilityFilterType = 'single';
        } else {
          // Multiple facilities: Use IN clause (Requirement 8.3)
          facilityFilter = inArray(schemaFormDataEntries.facilityId, filters.facilityIds);
          facilityFilterType = 'multiple';
        }
      } else if (filters.facilityId) {
        // Backward compatibility: single facilityId field
        facilityFilter = eq(schemaFormDataEntries.facilityId, filters.facilityId);
        facilityFilterType = 'single';
      } else {
        // No facility filter
        facilityFilter = undefined;
        facilityFilterType = 'none';
      }

      // Query for quarterly JSON data entries
      const jsonDataQuery = this.db
        .select({
          facilityId: schemaFormDataEntries.facilityId,
          entityType: schemaFormDataEntries.entityType,
          reportingPeriodId: schemaFormDataEntries.reportingPeriodId,
          formData: schemaFormDataEntries.formData
        })
        .from(schemaFormDataEntries)
        .where(and(
          eq(schemaFormDataEntries.projectId, projectId),
          facilityFilter, // Use optimized facility filter
          eq(schemaFormDataEntries.reportingPeriodId, targetPeriodId),
          inArray(schemaFormDataEntries.entityType, filters.entityTypes),
          sql`${schemaFormDataEntries.entityId} IS NULL`, // Only JSON data
          sql`${schemaFormDataEntries.formData}->>'activities' IS NOT NULL` // Has activities array
        ));

      const jsonResults = await jsonDataQuery;
      
      const queryExecutionTime = Date.now() - queryStartTime;
      

      
      console.log(`Found ${jsonResults.length} quarterly JSON entries`);

      if (jsonResults.length === 0) {
        return [];
      }

      const eventEntries: EventEntry[] = [];

      // Pre-load mappings to avoid repeated database calls
      const activityCodeToIdMap = await this.getActivityCodeToIdMapping(filters.projectType);
      
      // Collect all activity IDs from both execution mapping and planning JSON keys
      const executionActivityIds = Array.from(activityCodeToIdMap.values());
      const planningActivityIds: number[] = [];
      
      // Extract planning activity IDs from JSON entries
      for (const jsonEntry of jsonResults) {
        const formData = jsonEntry.formData as any;
        const rawActivities = formData.activities;
        
        if (rawActivities && typeof rawActivities === 'object' && !Array.isArray(rawActivities)) {
          // Check if this looks like planning structure (numeric keys)
          const keys = Object.keys(rawActivities);
          if (keys.length > 0 && /^\d+$/.test(keys[0])) {
            // Planning structure - extract numeric IDs
            const numericIds = keys.map(key => parseInt(key)).filter(id => !isNaN(id));
            planningActivityIds.push(...numericIds);
          }
        }
      }
      
      // Combine all activity IDs and get event mappings
      const allActivityIds = [...new Set([...executionActivityIds, ...planningActivityIds])];
      console.log(`[CollectQuarterlyJSON] Found ${executionActivityIds.length} execution activities, ${planningActivityIds.length} planning activities`);
      const eventMappings = await this.getEventMappingsForActivities(allActivityIds);

      // Process each JSON entry with structure detection
      for (const jsonEntry of jsonResults) {
        const formData = jsonEntry.formData as any;

        const rawActivities = formData.activities;
        
        // Detect JSON structure type
        const structureType = this.detectJsonStructure(rawActivities);

        let processedEntries: EventEntry[] = [];

        if (structureType === 'planning') {
          // Process planning JSON structure (numeric ID keys)
          processedEntries = await this.processPlanningJsonStructure(
            rawActivities,
            jsonEntry,
            targetPeriodId,
            eventFilter,
            eventMappings
          );
        } else if (structureType === 'execution') {
          // Process execution JSON structure (string code keys)
          processedEntries = await this.processExecutionJsonStructure(
            rawActivities,
            jsonEntry,
            targetPeriodId,
            eventFilter,
            activityCodeToIdMap,
            eventMappings
          );
        } else {
          console.warn(`[JSON Structure] Unknown structure type for facility ${jsonEntry.facilityId}, skipping`);
          continue;
        }

        eventEntries.push(...processedEntries);
      }

      return eventEntries;

    } catch (error) {
      console.error('Error collecting quarterly JSON data:', error);
      return [];
    }
  }

  /**
   * Detect JSON structure type based on activities data
   */
  private detectJsonStructure(rawActivities: any): 'planning' | 'execution' | 'unknown' {
    if (!rawActivities) {
      return 'unknown';
    }

    // Check if activities is an array (execution structure)
    if (Array.isArray(rawActivities)) {
      return 'execution';
    }

    // Check if activities is an object with keys
    if (typeof rawActivities === 'object') {
      const keys = Object.keys(rawActivities);
      if (keys.length === 0) {
        return 'unknown';
      }

      // Check if keys are numeric (planning structure)
      const firstKey = keys[0];
      const isNumericKey = /^\d+$/.test(firstKey);
      
      if (isNumericKey) {
        return 'planning';
      } else {
        return 'execution';
      }
    }

    return 'unknown';
  }

  /**
   * Process planning JSON structure with numeric activity ID keys
   */
  private async processPlanningJsonStructure(
    rawActivities: any,
    jsonEntry: any,
    targetPeriodId: number,
    eventFilter: any,
    eventMappings: Map<number, { eventId: number; eventCode: string }>
  ): Promise<EventEntry[]> {
    const eventEntries: EventEntry[] = [];

    if (!rawActivities || typeof rawActivities !== 'object') {
      console.warn('[Planning JSON] Invalid activities structure');
      return eventEntries;
    }

    const activityIds = Object.keys(rawActivities).map(key => parseInt(key)).filter(id => !isNaN(id));

    for (const [activityIdStr, activityData] of Object.entries(rawActivities)) {
      const activityId = parseInt(activityIdStr);
      
      if (isNaN(activityId)) {
        continue;
      }

      const eventMapping = eventMappings.get(activityId);
      if (!eventMapping) {
        continue;
      }

      // Check if this event should be included based on the filter
      if (eventFilter && !this.eventMatchesFilter(eventMapping.eventId, eventMapping.eventCode, eventFilter)) {
        continue;
      }

      // Extract total_budget from planning data
      const totalBudget = Number((activityData as any).total_budget) || 0;
      
      if (totalBudget !== 0) {
        eventEntries.push({
          eventCode: eventMapping.eventCode,
          facilityId: jsonEntry.facilityId,
          amount: totalBudget,
          entityType: jsonEntry.entityType as EventType,
          reportingPeriodId: jsonEntry.reportingPeriodId || targetPeriodId
        });
      }
    }

    return eventEntries;
  }

  /**
   * Process execution JSON structure with string activity code keys
   */
  private async processExecutionJsonStructure(
    rawActivities: any,
    jsonEntry: any,
    targetPeriodId: number,
    eventFilter: any,
    activityCodeToIdMap: Map<string, number>,
    eventMappings: Map<number, { eventId: number; eventCode: string }>
  ): Promise<EventEntry[]> {
    const eventEntries: EventEntry[] = [];

    // Convert to array if it's an object
    const activities = Array.isArray(rawActivities)
      ? rawActivities 
      : rawActivities && typeof rawActivities === 'object'
        ? Object.values(rawActivities)
        : [];

    if (activities.length === 0) {
      return eventEntries;
    }

    for (const activity of activities) {
      const activityCode = activity.code;
      const activityId = activityCodeToIdMap.get(activityCode);

      if (!activityId) {
        continue;
      }

      const eventMapping = eventMappings.get(activityId);
      if (!eventMapping) {
        continue;
      }

      // Check if this event should be included based on the filter
      if (eventFilter && !this.eventMatchesFilter(eventMapping.eventId, eventMapping.eventCode, eventFilter)) {
        continue;
      }

      // CRITICAL FIX: Use cumulative_balance for stock sections (D, E) and sum quarters for flow sections (A, B, G)
      // Stock sections (D, E) represent balances at a point in time - use cumulative_balance
      // Flow sections (A, B, G) represent flows over time - sum all quarters
      // EXCEPTION: "Accumulated Surplus/Deficit" in Section G is a stock item (same value all quarters)
      
      let totalAmount = 0;
      
      // Extract section from activity code (e.g., "HIV_EXEC_HOSPITAL_D_1" -> "D")
      const section = this.extractSectionFromCode(activityCode);
      
      // Check if this is "Accumulated Surplus/Deficit" - a special case in Section G
      // It's a stock item that stays the same across all quarters
      // Detection methods:
      // 1. Activity name contains "accumulated" AND ("surplus" OR "deficit")
      // 2. Activity code pattern: _G_1 (not in G-01 subcategory) - e.g., HIV_EXEC_HOSPITAL_G_1
      const activityName = (activity.name || '').toLowerCase();
      const activityCodeLower = activityCode.toLowerCase();
      
      const isAccumulatedSurplusDeficitByName = 
        activityName.includes('accumulated') && 
        (activityName.includes('surplus') || activityName.includes('deficit'));
      
      // Check for _G_1 pattern (e.g., HIV_EXEC_HOSPITAL_G_1) but NOT _G_G-01_ (Prior Year Adjustments)
      const isAccumulatedSurplusDeficitByCode = 
        section === 'G' && 
        activityCodeLower.includes('_g_1') && 
        !activityCodeLower.includes('_g_g-01');
      
      const isAccumulatedSurplusDeficit = isAccumulatedSurplusDeficitByName || isAccumulatedSurplusDeficitByCode;
      
      if (section === 'D' || section === 'E') {
        // Stock sections: Use cumulative_balance (represents balance at the latest reported quarter)
        // This ensures we get the correct balance sheet values for Financial Assets and Liabilities
        totalAmount = Number(activity.cumulative_balance) || 0;
        console.log(`[DataAggregation] Section ${section} (stock): ${activityCode}, cumulative_balance: ${activity.cumulative_balance}, totalAmount: ${totalAmount}`);
      } else if (isAccumulatedSurplusDeficit) {
        // Accumulated Surplus/Deficit: Use Q1 value (same for all quarters, it's a stock item)
        // This is the opening balance from the previous fiscal year's closing balance
        totalAmount = Number(activity.q1) || Number(activity.cumulative_balance) || 0;
        console.log(`[DataAggregation] Accumulated Surplus/Deficit detected: ${activityCode}, using Q1 value: ${totalAmount} (byName: ${isAccumulatedSurplusDeficitByName}, byCode: ${isAccumulatedSurplusDeficitByCode})`);
      } else {
        // Flow sections: Sum all quarters (represents total flow over the period)
        // This is correct for Revenue (A), Expenditures (B), and other Equity changes (G)
        totalAmount = (Number(activity.q1) || 0) + (Number(activity.q2) || 0) + 
                     (Number(activity.q3) || 0) + (Number(activity.q4) || 0);
      }

      // For stock sections (D, E), include even zero values as they are meaningful balance sheet items
      // For flow sections, only include non-zero values
      const isStockSection = section === 'D' || section === 'E';
      if (totalAmount !== 0 || isStockSection) {
        eventEntries.push({
          eventCode: eventMapping.eventCode,
          facilityId: jsonEntry.facilityId,
          amount: totalAmount,
          entityType: jsonEntry.entityType as EventType,
          reportingPeriodId: jsonEntry.reportingPeriodId || targetPeriodId
        });
      }
    }

    return eventEntries;
  }

  /**
   * Get project ID for a given project type
   */
  private async getProjectIdForProjectType(projectType?: string): Promise<number | null> {
    if (!projectType) return null;

    try {
      const project = await this.db.query.projects.findFirst({
        where: sql`${projects.projectType} = ${projectType}`
      });
      return project?.id || null;
    } catch (error) {
      console.error('Error getting project ID:', error);
      return null;
    }
  }

  /**
   * Get mapping from activity codes to activity IDs
   */
  private async getActivityCodeToIdMapping(projectType?: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    try {
      const whereConditions = [eq(dynamicActivities.moduleType, 'execution')];
      if (projectType) {
        whereConditions.push(sql`${dynamicActivities.projectType} = ${projectType}`);
      }

      const activities = await this.db.query.dynamicActivities.findMany({
        where: and(...whereConditions)
      });

      for (const activity of activities) {
        if (activity.code) {
          map.set(activity.code, activity.id);
        }
      }

      console.log(`Built activity code mapping: ${map.size} activities`);
    } catch (error) {
      console.error('Error building activity code mapping:', error);
    }

    return map;
  }

  /**
   * Get event mappings for activity IDs
   */
  private async getEventMappingsForActivities(
    activityIds: number[]
  ): Promise<Map<number, { eventId: number; eventCode: string }>> {
    const map = new Map<number, { eventId: number; eventCode: string }>();

    if (activityIds.length === 0) return map;

    try {
      const mappings = await this.db
        .select({
          activityId: configurableEventMappings.activityId,
          eventId: configurableEventMappings.eventId,
          eventCode: events.code
        })
        .from(configurableEventMappings)
        .innerJoin(events, eq(configurableEventMappings.eventId, events.id))
        .where(and(
          inArray(configurableEventMappings.activityId, activityIds),
          eq(configurableEventMappings.isActive, true)
        ));

      for (const mapping of mappings) {
        if (mapping.activityId && mapping.eventId && mapping.eventCode) {
          map.set(mapping.activityId, {
            eventId: mapping.eventId,
            eventCode: mapping.eventCode
          });
        }
      }

      console.log(`Built event mappings: ${map.size} mappings`);
    } catch (error) {
      console.error('Error building event mappings:', error);
    }

    return map;
  }

  /**
   * Extract section letter from activity code
   * Examples:
   *   "HIV_EXEC_HOSPITAL_D_1" -> "D"
   *   "MAL_EXEC_HEALTH_CENTER_E_3" -> "E"
   *   "TB_EXEC_HOSPITAL_A_2" -> "A"
   */
  private extractSectionFromCode(code: string): string | null {
    if (!code) return null;
    
    const parts = code.split('_');
    const execIndex = parts.findIndex(p => p === 'EXEC');
    
    if (execIndex === -1) return null;
    
    // Find the first single-letter part after 'EXEC' that matches A-G or X
    for (let i = execIndex + 1; i < parts.length; i++) {
      if (parts[i].length === 1 && /[A-GX]/.test(parts[i])) {
        return parts[i];
      }
    }
    
    return null;
  }

  /**
   * Check if an event matches the filter criteria
   */
  private eventMatchesFilter(_eventId: number, _eventCode: string, _eventFilter: any): boolean {
    // This is a simplified check. In a real implementation, you'd need to properly
    // evaluate the SQL filter condition against the event ID and code.
    // For now, we'll return true to include all events when using JSON approach.
    return true;
  }

  private async getPreviousPeriodId(currentPeriodId: number): Promise<number | null> {
    try {
      console.log(`[getPreviousPeriodId] Looking for previous period of ${currentPeriodId}`);
      
      // Get current period details
      const currentPeriod = await this.db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.id, currentPeriodId)
      });

      if (!currentPeriod) {
        console.log(`[getPreviousPeriodId] Current period ${currentPeriodId} not found`);
        return null;
      }

      console.log(`[getPreviousPeriodId] Current period: Year ${currentPeriod.year}, Type: ${currentPeriod.periodType}`);

      // Handle period boundary logic for fiscal vs calendar years
      let previousYear = currentPeriod.year - 1;
      
      // For different period types, adjust the logic
      if (currentPeriod.periodType === 'QUARTERLY') {
        // For quarterly periods, we need to find the previous quarter
        // This is simplified - in a real system you'd need more complex logic
        // to handle quarter boundaries within the same year
        const currentStartDate = new Date(currentPeriod.startDate);
        const previousEndDate = new Date(currentStartDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        
        // Find period that ends just before current period starts
        const previousPeriod = await this.db.query.reportingPeriods.findFirst({
          where: and(
            eq(reportingPeriods.periodType, currentPeriod.periodType),
            sql`end_date < ${currentPeriod.startDate}`
          ),
          orderBy: sql`end_date DESC`
        });
        
        return previousPeriod?.id || null;
      } else {
        // For annual periods, find previous year with same period type
        console.log(`[getPreviousPeriodId] Looking for annual period: Year ${previousYear}`);
        
        const whereConditions = [
          eq(reportingPeriods.year, previousYear)
        ];

        // Add period type condition if it exists
        if (currentPeriod.periodType) {
          whereConditions.push(eq(reportingPeriods.periodType, currentPeriod.periodType));
        }
        
        const previousPeriod = await this.db.query.reportingPeriods.findFirst({
          where: and(...whereConditions)
        });

        if (previousPeriod) {
          console.log(`[getPreviousPeriodId] Found previous period: ID ${previousPeriod.id}, Year ${previousPeriod.year}`);
        } else {
          console.log(`[getPreviousPeriodId] No previous period found for year ${previousYear}`);
        }

        return previousPeriod?.id || null;
      }

    } catch (error) {
      console.error('[getPreviousPeriodId] Error finding previous period:', error);
      return null;
    }
  }

  /**
   * Apply data source prioritization (execution over planning)
   */
  private prioritizeDataSources(entries: EventEntry[]): EventEntry[] {
    // Group by event code and facility
    const grouped = new Map<string, EventEntry[]>();
    
    for (const entry of entries) {
      const groupKey = `${entry.eventCode}_${entry.facilityId}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(entry);
    }

    // For each group, prioritize execution data over planning data
    const prioritized: EventEntry[] = [];
    
    for (const groupEntries of grouped.values()) {
      const executionEntries = groupEntries.filter(e => e.entityType === EventType.EXECUTION);
      const planningEntries = groupEntries.filter(e => e.entityType === EventType.PLANNING);

      // Use execution data if available, otherwise use planning data
      if (executionEntries.length > 0) {
        prioritized.push(...executionEntries);
      } else {
        prioritized.push(...planningEntries);
      }
    }

    return prioritized;
  }

  /**
   * Handle missing previous period data gracefully by creating empty aggregation
   */
  private createEmptyPeriodAggregation(): EventAggregation {
    return {
      eventTotals: new Map<string, number>(),
      facilityTotals: new Map<number, number>(),
      periodTotals: new Map<number, number>(),
      metadata: {
        totalEvents: 0,
        totalFacilities: 0,
        totalAmount: 0,
        aggregationMethod: 'SUM',
        processingTime: 0
      }
    };
  }

  /**
   * Get period information for display purposes
   */
  async getPeriodInfo(periodId: number): Promise<{
    year: number;
    periodType?: string;
    startDate?: Date;
    endDate?: Date;
  } | null> {
    try {
      const period = await this.db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.id, periodId)
      });

      if (!period) {
        return null;
      }

      return {
        year: period.year,
        periodType: period.periodType || undefined,
        startDate: period.startDate ? new Date(period.startDate) : undefined,
        endDate: period.endDate ? new Date(period.endDate) : undefined
      };
    } catch (error) {
      console.error('Error getting period info:', error);
      return null;
    }
  }

  /**
   * Get variance analysis summary for a period comparison
   */
  getVarianceAnalysis(periodComparison: PeriodComparison): {
    summary: ReturnType<typeof VarianceCalculator.calculateVarianceSummary>;
    significantVariances: Array<{
      eventCode: string;
      variance: VarianceCalculation;
      significance: 'low' | 'medium' | 'high' | 'critical';
      formatted: ReturnType<typeof VarianceCalculator.formatVariance>;
    }>;
    topIncreases: Array<{ eventCode: string; variance: VarianceCalculation }>;
    topDecreases: Array<{ eventCode: string; variance: VarianceCalculation }>;
  } {
    const summary = VarianceCalculator.calculateVarianceSummary(periodComparison.variances);
    
    // Get significant variances with formatting
    const significantVariances = Array.from(periodComparison.variances.entries())
      .map(([eventCode, variance]) => ({
        eventCode,
        variance,
        significance: VarianceCalculator.getVarianceSignificance(variance),
        formatted: VarianceCalculator.formatVariance(variance, { showCurrency: true })
      }))
      .filter(item => item.significance === 'high' || item.significance === 'critical')
      .sort((a, b) => Math.abs(b.variance.absolute) - Math.abs(a.variance.absolute));

    // Get top 5 increases by absolute value
    const topIncreases = Array.from(periodComparison.variances.entries())
      .filter(([, variance]) => variance.trend === 'increase')
      .map(([eventCode, variance]) => ({ eventCode, variance }))
      .sort((a, b) => b.variance.absolute - a.variance.absolute)
      .slice(0, 5);

    // Get top 5 decreases by absolute value
    const topDecreases = Array.from(periodComparison.variances.entries())
      .filter(([, variance]) => variance.trend === 'decrease')
      .map(([eventCode, variance]) => ({ eventCode, variance }))
      .sort((a, b) => a.variance.absolute - b.variance.absolute)
      .slice(0, 5);

    return {
      summary,
      significantVariances,
      topIncreases,
      topDecreases
    };
  }

  /**
   * Format variance for display in statement lines
   */
  formatVarianceForDisplay(
    currentValue: number,
    previousValue: number,
    options: {
      showCurrency?: boolean;
      currencySymbol?: string;
      decimalPlaces?: number;
    } = {}
  ): {
    variance: ReturnType<typeof VarianceCalculator.calculateLineVariance>;
    formatted: ReturnType<typeof VarianceCalculator.formatVariance>;
    significance: 'low' | 'medium' | 'high' | 'critical';
  } {
    const variance = VarianceCalculator.calculateLineVariance(currentValue, previousValue);
    const varianceCalc = VarianceCalculator.calculateVariance(currentValue, previousValue);
    const formatted = VarianceCalculator.formatVariance(varianceCalc, options);
    const significance = VarianceCalculator.getVarianceSignificance(varianceCalc);

    return {
      variance,
      formatted,
      significance
    };
  }

  /**
   * Get facilities included in data collection based on filters and actual data
   */
  private async getFacilitiesIncluded(
    filters: DataFilters,
    currentPeriodData: EventEntry[],
    previousPeriodData: EventEntry[]
  ): Promise<number[]> {
    if (filters.facilityId) {
      // Single facility specified
      return [filters.facilityId];
    }

    // Get unique facility IDs from collected data
    const allData = [...currentPeriodData, ...previousPeriodData];
    const facilityIds = [...new Set(allData.map(entry => entry.facilityId))];
    
    return facilityIds.sort((a, b) => a - b);
  }

  /**
   * Collect event data for specific facilities with aggregation support
   */
  async collectEventDataForFacilities(
    filters: DataFilters,
    eventCodes: string[],
    facilityIds?: number[]
  ): Promise<EventDataCollection> {
    try {
      // If specific facility IDs provided, override the filter
      const facilitiesToProcess = facilityIds || (filters.facilityId ? [filters.facilityId] : []);
      
      if (facilitiesToProcess.length === 0) {
        // No specific facilities - collect all facilities for the project
        return this.collectEventData(filters, eventCodes);
      }

      // Collect data for each facility and aggregate
      const facilityDataPromises = facilitiesToProcess.map(async (facilityId) => {
        const facilityFilters = { ...filters, facilityId };
        return this.collectEventData(facilityFilters, eventCodes);
      });

      const facilityDataCollections = await Promise.all(facilityDataPromises);

      // Aggregate data across facilities
      const aggregatedCurrentPeriod: EventEntry[] = [];
      const aggregatedPreviousPeriod: EventEntry[] = [];
      let totalEvents = 0;

      for (const collection of facilityDataCollections) {
        aggregatedCurrentPeriod.push(...collection.currentPeriod);
        aggregatedPreviousPeriod.push(...collection.previousPeriod);
        totalEvents += collection.metadata.totalEvents;
      }

      const metadata: CollectionMetadata = {
        totalEvents,
        facilitiesIncluded: facilitiesToProcess,
        periodsIncluded: [filters.reportingPeriodId],
        dataSources: filters.entityTypes,
        collectionTimestamp: new Date()
      };

      return {
        currentPeriod: aggregatedCurrentPeriod,
        previousPeriod: aggregatedPreviousPeriod,
        metadata
      };

    } catch (error) {
      console.error('Error collecting facility-specific event data:', error);
      throw error;
    }
  }

  /**
   * Aggregate event data with facility-specific breakdowns
   */
  async aggregateByEventWithFacilities(eventData: EventDataCollection): Promise<EventAggregation & {
    facilityBreakdown: Map<number, Map<string, number>>;
    crossFacilityTotals: Map<string, number>;
  }> {
    const startTime = Date.now();
    
    const eventTotals = new Map<string, number>();
    const facilityTotals = new Map<number, number>();
    const periodTotals = new Map<number, number>();
    const facilityBreakdown = new Map<number, Map<string, number>>();
    const crossFacilityTotals = new Map<string, number>();

    // Aggregate current period data with facility breakdown
    for (const entry of eventData.currentPeriod) {
      // Event totals (cross-facility)
      const currentEventTotal = eventTotals.get(entry.eventCode) || 0;
      eventTotals.set(entry.eventCode, currentEventTotal + entry.amount);

      // Cross-facility totals by event code
      const currentCrossFacilityTotal = crossFacilityTotals.get(entry.eventCode) || 0;
      crossFacilityTotals.set(entry.eventCode, currentCrossFacilityTotal + entry.amount);

      // Facility totals
      const currentFacilityTotal = facilityTotals.get(entry.facilityId) || 0;
      facilityTotals.set(entry.facilityId, currentFacilityTotal + entry.amount);

      // Facility breakdown by event code
      if (!facilityBreakdown.has(entry.facilityId)) {
        facilityBreakdown.set(entry.facilityId, new Map<string, number>());
      }
      const facilityEventMap = facilityBreakdown.get(entry.facilityId)!;
      const currentFacilityEventTotal = facilityEventMap.get(entry.eventCode) || 0;
      facilityEventMap.set(entry.eventCode, currentFacilityEventTotal + entry.amount);

      // Period totals
      const currentPeriodTotal = periodTotals.get(entry.reportingPeriodId) || 0;
      periodTotals.set(entry.reportingPeriodId, currentPeriodTotal + entry.amount);
    }

    const processingTime = Date.now() - startTime;
    const totalAmount = Array.from(eventTotals.values()).reduce((sum, amount) => sum + amount, 0);

    const metadata: AggregationMetadata = {
      totalEvents: eventData.currentPeriod.length,
      totalFacilities: facilityTotals.size,
      totalAmount,
      aggregationMethod: 'SUM',
      processingTime
    };

    return {
      eventTotals,
      facilityTotals,
      periodTotals,
      metadata,
      facilityBreakdown,
      crossFacilityTotals
    };
  }

  /**
   * Get facility information for included facilities
   */
  async getFacilityInfo(facilityIds: number[]): Promise<Map<number, {
    id: number;
    name: string;
    type: string;
    district?: string;
    hasData: boolean;
  }>> {
    try {
      const facilityInfoMap = new Map();

      if (facilityIds.length === 0) {
        return facilityInfoMap;
      }

      // Query facility information from database
      const facilitiesData = await this.db.query.facilities.findMany({
        where: inArray(facilities.id, facilityIds),
        with: {
          district: true
        }
      });

      // Check which facilities have data
      const facilitiesWithData = await this.getFacilitiesWithData(facilityIds);

      for (const facility of facilitiesData) {
        facilityInfoMap.set(facility.id, {
          id: facility.id,
          name: facility.name,
          type: facility.facilityType,
          district: facility.district?.name,
          hasData: facilitiesWithData.has(facility.id)
        });
      }

      // Add entries for facilities that have data but no facility record
      for (const facilityId of facilityIds) {
        if (!facilityInfoMap.has(facilityId)) {
          facilityInfoMap.set(facilityId, {
            id: facilityId,
            name: `Facility ${facilityId}`,
            type: 'Unknown',
            district: undefined,
            hasData: facilitiesWithData.has(facilityId)
          });
        }
      }

      return facilityInfoMap;

    } catch (error) {
      console.error('Error getting facility info:', error);
      return new Map();
    }
  }

  /**
   * Get facilities that have data for the given filters
   */
  private async getFacilitiesWithData(facilityIds: number[]): Promise<Set<number>> {
    try {
      const query = this.db
        .select({
          facilityId: schemaFormDataEntries.facilityId
        })
        .from(schemaFormDataEntries)
        .where(inArray(schemaFormDataEntries.facilityId, facilityIds))
        .groupBy(schemaFormDataEntries.facilityId);

      const results = await query;
      return new Set(results.map(r => r.facilityId));

    } catch (error) {
      console.error('Error checking facilities with data:', error);
      return new Set();
    }
  }

  /**
   * Validate facility access and existence
   */
  async validateFacilityAccess(
    facilityIds: number[],
    projectId: number
  ): Promise<{
    validFacilities: number[];
    invalidFacilities: number[];
    accessDenied: number[];
    errors: string[];
  }> {
    try {
      const validFacilities: number[] = [];
      const invalidFacilities: number[] = [];
      const accessDenied: number[] = [];
      const errors: string[] = [];

      if (facilityIds.length === 0) {
        return { validFacilities, invalidFacilities, accessDenied, errors };
      }

      // First, check if facilities exist
      const existingFacilities = await this.db.query.facilities.findMany({
        where: inArray(facilities.id, facilityIds)
      });

      const foundFacilityIds = new Set(existingFacilities.map(f => f.id));

      // For now, just validate that facilities exist
      // TODO: Implement proper project-facility access control based on business rules
      for (const facilityId of facilityIds) {
        if (!foundFacilityIds.has(facilityId)) {
          invalidFacilities.push(facilityId);
          errors.push(`Facility ${facilityId} does not exist`);
          continue;
        }

        // For now, allow access to all existing facilities
        // In a production system, you would implement proper access control here
        validFacilities.push(facilityId);
      }

      return { validFacilities, invalidFacilities, accessDenied, errors };

    } catch (error) {
      console.error('Error validating facility access:', error);
      return {
        validFacilities: [],
        invalidFacilities: facilityIds,
        accessDenied: [],
        errors: [`Failed to validate facility access: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Handle missing facility data gracefully
   */
  handleMissingFacilityData(
    requestedFacilities: number[],
    facilitiesWithData: number[]
  ): {
    facilitiesWithData: number[];
    facilitiesWithoutData: number[];
    warnings: string[];
    shouldContinue: boolean;
  } {
    const facilitiesWithoutData = requestedFacilities.filter(
      id => !facilitiesWithData.includes(id)
    );

    const warnings: string[] = [];
    
    if (facilitiesWithoutData.length > 0) {
      warnings.push(
        `${facilitiesWithoutData.length} facilities have no data: ${facilitiesWithoutData.join(', ')}`
      );
    }

    // Continue processing if at least one facility has data
    const shouldContinue = facilitiesWithData.length > 0;

    if (!shouldContinue && requestedFacilities.length > 0) {
      warnings.push('No facilities have data for the specified criteria');
    }

    return {
      facilitiesWithData,
      facilitiesWithoutData,
      warnings,
      shouldContinue
    };
  }}