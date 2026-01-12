import { db } from "@/db";
import { districts, provinces } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { ScopeQueryParams, ScopeDetails } from "./scope-access-control";

/**
 * Build scope metadata for API response
 * Extracts geographic entity information based on the scope type
 * 
 * @param scope - The organizational scope ('district', 'provincial', or 'country')
 * @param queryParams - Query parameters including optional districtId and provinceId
 * @param results - Query results containing facility data
 * @returns Structured ScopeDetails object with relevant metadata
 */
export async function buildScopeMetadata(
  scope: 'district' | 'provincial' | 'country',
  queryParams: ScopeQueryParams,
  results: any[]
): Promise<ScopeDetails> {
  // Extract unique district IDs from query results
  const uniqueDistrictIds = [...new Set(
    results
      .map(r => r.facility?.districtId)
      .filter((id): id is number => id !== null && id !== undefined)
  )];
  
  switch (scope) {
    case 'district': {
      // Query database for district names
      if (uniqueDistrictIds.length === 0) {
        return {
          districtIds: [],
          districtNames: [],
          districtCount: 0,
        };
      }
      
      const districtRecords = await db
        .select({ 
          id: districts.id, 
          name: districts.name 
        })
        .from(districts)
        .where(inArray(districts.id, uniqueDistrictIds));
      
      // For district scope, if there's a specific districtId in queryParams, include it
      const metadata: ScopeDetails = {
        districtIds: districtRecords.map(d => d.id),
        districtNames: districtRecords.map(d => d.name),
        districtCount: districtRecords.length,
      };
      
      // Add single districtId and districtName if only one district is in scope
      if (queryParams.districtId && districtRecords.length === 1) {
        metadata.districtId = districtRecords[0].id;
        metadata.districtName = districtRecords[0].name;
      }
      
      return metadata;
    }
    
    case 'provincial': {
      // Query database for province name
      if (!queryParams.provinceId) {
        throw new Error("provinceId is required for provincial scope metadata");
      }
      
      const provinceRecords = await db
        .select({ 
          id: provinces.id, 
          name: provinces.name 
        })
        .from(provinces)
        .where(eq(provinces.id, queryParams.provinceId))
        .limit(1);
      
      const province = provinceRecords[0];
      
      // Query database for district names in this province
      let districtNames: string[] = [];
      if (uniqueDistrictIds.length > 0) {
        const districtRecords = await db
          .select({ 
            id: districts.id, 
            name: districts.name 
          })
          .from(districts)
          .where(inArray(districts.id, uniqueDistrictIds));
        
        districtNames = districtRecords.map(d => d.name);
      }
      
      return {
        provinceId: province?.id,
        provinceName: province?.name,
        districtCount: uniqueDistrictIds.length,
        districtIds: uniqueDistrictIds,
        districtNames,
      };
    }
    
    case 'country': {
      // Query database for total province count and names
      const allProvinces = await db
        .select({ 
          id: provinces.id,
          name: provinces.name 
        })
        .from(provinces);
      
      // Query database for district names
      let districtNames: string[] = [];
      if (uniqueDistrictIds.length > 0) {
        const districtRecords = await db
          .select({ 
            id: districts.id, 
            name: districts.name 
          })
          .from(districts)
          .where(inArray(districts.id, uniqueDistrictIds));
        
        districtNames = districtRecords.map(d => d.name);
      }
      
      return {
        provinceCount: allProvinces.length,
        districtCount: uniqueDistrictIds.length,
        districtIds: uniqueDistrictIds,
        districtNames,
      };
    }
    
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = scope;
      throw new Error(`Unsupported scope: ${_exhaustive}`);
    }
  }
}
