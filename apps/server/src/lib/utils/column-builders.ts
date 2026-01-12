import { db } from "@/api/db";
import { districts, provinces } from "@/api/db/schema";
import { inArray } from "drizzle-orm";

// Type definition for FacilityColumn (to avoid circular dependency)
interface FacilityColumn {
  id: number;
  name: string;
  facilityType: string;
  projectType: string;
  hasData: boolean;
}

interface ExecutionEntry {
  id: number;
  formData: any;
  computedValues: any;
  facilityId: number;
  facilityName: string;
  facilityType: string;
  projectType: string;
  year?: number;
  quarter?: string;
  districtId?: number;
  districtName?: string;
  provinceId?: number;
  provinceName?: string;
}

interface Column {
  id: number;
  name: string;
  type: 'facility' | 'district' | 'province';
  facilityType?: string;
  projectType?: string;
  hasData: boolean;
  aggregatedFacilityCount?: number;
  facilityIds: number[]; // IDs of facilities that belong to this column
}

/**
 * Build facility-level columns for district scope
 * Each column represents an individual facility
 */
export function buildFacilityColumns(executionData: ExecutionEntry[]): Column[] {
  const facilityMap = new Map<number, Column>();

  executionData.forEach(entry => {
    if (!facilityMap.has(entry.facilityId)) {
      facilityMap.set(entry.facilityId, {
        id: entry.facilityId,
        name: entry.facilityName,
        type: 'facility',
        facilityType: entry.facilityType,
        projectType: entry.projectType,
        hasData: true,
        aggregatedFacilityCount: 1,
        facilityIds: [entry.facilityId]
      });
    }
  });

  return Array.from(facilityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build district-level columns for provincial scope
 * Each column represents a district (aggregating all facilities in that district)
 */
export async function buildDistrictColumns(
  executionData: ExecutionEntry[]
): Promise<Column[]> {
  // Get unique district IDs from execution data
  const districtIds = [...new Set(executionData.map(e => e.districtId).filter(Boolean))] as number[];

  if (districtIds.length === 0) {
    return [];
  }

  // Fetch district information
  const districtData = await db
    .select({
      id: districts.id,
      name: districts.name,
      provinceId: districts.provinceId
    })
    .from(districts)
    .where(inArray(districts.id, districtIds));

  // Group facilities by district
  const districtMap = new Map<number, {
    district: typeof districtData[0];
    facilityIds: number[];
  }>();

  executionData.forEach(entry => {
    if (entry.districtId) {
      if (!districtMap.has(entry.districtId)) {
        const district = districtData.find(d => d.id === entry.districtId);
        if (district) {
          districtMap.set(entry.districtId, {
            district,
            facilityIds: []
          });
        }
      }
      districtMap.get(entry.districtId)?.facilityIds.push(entry.facilityId);
    }
  });

  // Create columns
  const columns: Column[] = Array.from(districtMap.values()).map(({ district, facilityIds }) => ({
    id: district.id,
    name: `${district.name} District`,
    type: 'district' as const,
    hasData: true,
    aggregatedFacilityCount: new Set(facilityIds).size,
    facilityIds: [...new Set(facilityIds)]
  }));

  return columns.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build province-level columns for country scope
 * Each column represents a province (aggregating all facilities in that province)
 */
export async function buildProvinceColumns(executionData: ExecutionEntry[]): Promise<Column[]> {
  // Get unique province IDs from execution data
  const provinceIds = [...new Set(executionData.map(e => e.provinceId).filter(Boolean))] as number[];

  if (provinceIds.length === 0) {
    return [];
  }

  // Fetch province information
  const provinceData = await db
    .select({
      id: provinces.id,
      name: provinces.name
    })
    .from(provinces)
    .where(inArray(provinces.id, provinceIds));

  // Group facilities by province
  const provinceMap = new Map<number, {
    province: typeof provinceData[0];
    facilityIds: number[];
  }>();

  executionData.forEach(entry => {
    if (entry.provinceId) {
      if (!provinceMap.has(entry.provinceId)) {
        const province = provinceData.find(p => p.id === entry.provinceId);
        if (province) {
          provinceMap.set(entry.provinceId, {
            province,
            facilityIds: []
          });
        }
      }
      provinceMap.get(entry.provinceId)?.facilityIds.push(entry.facilityId);
    }
  });

  // Create columns
  const columns: Column[] = Array.from(provinceMap.values()).map(({ province, facilityIds }) => ({
    id: province.id,
    name: province.name,
    type: 'province' as const,
    hasData: true,
    aggregatedFacilityCount: new Set(facilityIds).size,
    facilityIds: [...new Set(facilityIds)]
  }));

  return columns.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Aggregate execution data by columns
 * Maps facility-level data to the appropriate column based on scope
 */
export function aggregateDataByColumns(
  executionData: ExecutionEntry[],
  columns: Column[]
): ExecutionEntry[] {
  // Create a map of facilityId -> columnId
  const facilityToColumnMap = new Map<number, number>();
  
  columns.forEach(column => {
    column.facilityIds.forEach(facilityId => {
      facilityToColumnMap.set(facilityId, column.id);
    });
  });

  // Group execution data by column
  const columnDataMap = new Map<number, ExecutionEntry[]>();

  executionData.forEach(entry => {
    const columnId = facilityToColumnMap.get(entry.facilityId);
    if (columnId !== undefined) {
      if (!columnDataMap.has(columnId)) {
        columnDataMap.set(columnId, []);
      }
      columnDataMap.get(columnId)!.push(entry);
    }
  });

  // Aggregate data for each column
  const aggregatedData: ExecutionEntry[] = [];

  columns.forEach(column => {
    const columnEntries = columnDataMap.get(column.id) || [];
    
    if (columnEntries.length === 0) {
      console.log(`[COLUMN-BUILDER] [WARNING] No entries found for column ${column.name} (ID: ${column.id})`);
      return;
    }

    console.log(`[COLUMN-BUILDER] Aggregating ${columnEntries.length} facilities for column ${column.name} (ID: ${column.id})`);
    console.log(`[COLUMN-BUILDER] Facility IDs in this column: ${column.facilityIds.join(', ')}`);
    console.log(`[COLUMN-BUILDER] Entry facility IDs: ${columnEntries.map(e => e.facilityId).join(', ')}`);

    // Aggregate formData across all facilities in this column
    const aggregatedActivities = new Map<string, any>();
    const aggregatedComputedValues: any = {};

    columnEntries.forEach(entry => {
      // Handle activities - can be array or object
      let activitiesArray: any[] = [];
      const activitiesData = entry.formData?.activities;
      
      if (Array.isArray(activitiesData)) {
        activitiesArray = activitiesData;
      } else if (activitiesData && typeof activitiesData === 'object') {
        // Convert object to array
        activitiesArray = Object.values(activitiesData);
      }
      
      activitiesArray.forEach((activity: any) => {
        const originalCode = activity.code;
        if (!originalCode) return;

        // Normalize activity codes: convert HEALTH_CENTER codes to HOSPITAL codes
        // This allows aggregation across facility types
        // Example: HIV_EXEC_HEALTH_CENTER_A_2 -> HIV_EXEC_HOSPITAL_A_2
        const normalizedCode = originalCode.replace(/_HEALTH_CENTER_/g, '_HOSPITAL_');

        if (!aggregatedActivities.has(normalizedCode)) {
          aggregatedActivities.set(normalizedCode, {
            code: normalizedCode,
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            paymentStatus: activity.paymentStatus,
            amountPaid: 0
          });
        }

        const agg = aggregatedActivities.get(normalizedCode)!;
        agg.q1 += Number(activity.q1 || 0);
        agg.q2 += Number(activity.q2 || 0);
        agg.q3 += Number(activity.q3 || 0);
        agg.q4 += Number(activity.q4 || 0);
        if (activity.amountPaid) {
          agg.amountPaid += Number(activity.amountPaid || 0);
        }
      });

      // Sum up computed values
      Object.entries(entry.computedValues || {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
          aggregatedComputedValues[key] = (aggregatedComputedValues[key] || 0) + value;
        } else if (typeof value === 'object' && value !== null) {
          if (!aggregatedComputedValues[key]) {
            aggregatedComputedValues[key] = {};
          }
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (typeof subValue === 'number') {
              aggregatedComputedValues[key][subKey] = (aggregatedComputedValues[key][subKey] || 0) + subValue;
            }
          });
        }
      });
    });

    // Convert aggregated activities map to array
    const aggregatedFormData = {
      activities: Array.from(aggregatedActivities.values()),
      context: columnEntries[0]?.formData?.context || {}
    };

    // Log aggregation for debugging
    console.log(`[COLUMN-BUILDER] Aggregated ${aggregatedActivities.size} activities for column ${column.name}`);
    if (aggregatedActivities.size > 0) {
      const firstActivity = Array.from(aggregatedActivities.values())[0];
      console.log(`[COLUMN-BUILDER] Sample activity:`, JSON.stringify(firstActivity));
    }

    // Create aggregated entry for this column
    const firstEntry = columnEntries[0];
    aggregatedData.push({
      id: column.id, // Use column ID instead of facility ID
      formData: aggregatedFormData,
      computedValues: aggregatedComputedValues,
      facilityId: column.id, // Use column ID as facilityId for aggregation service
      facilityName: column.name,
      facilityType: column.facilityType || firstEntry.facilityType,
      projectType: firstEntry.projectType,
      year: firstEntry.year,
      quarter: firstEntry.quarter,
      districtId: firstEntry.districtId,
      districtName: firstEntry.districtName,
      provinceId: firstEntry.provinceId,
      provinceName: firstEntry.provinceName
    });
  });

  return aggregatedData;
}

/**
 * Convert Column type to FacilityColumn type for API response
 */
export function columnsToFacilityColumns(columns: Column[]): FacilityColumn[] {
  return columns.map(column => ({
    id: column.id,
    name: column.name,
    facilityType: column.facilityType || 'aggregated',
    projectType: column.projectType || 'aggregated',
    hasData: column.hasData
  }));
}
