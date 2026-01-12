/**
 * Access Control Service
 * 
 * Resolves scope filters (country, province, district, facility) into facility IDs
 * with proper access control validation based on user permissions.
 */

import type { UserContext } from '@/lib/utils/get-user-facility';
import { db } from '@/db';
import { facilities, districts } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Get accessible facilities in a province
 * Filters by user's accessible facility IDs to enforce access control
 * 
 * @param userContext - User context with access control information
 * @param provinceId - Province ID to filter by
 * @returns Array of facility IDs in the province that user can access
 */
export async function getAccessibleFacilitiesInProvince(
  userContext: UserContext,
  provinceId: number
): Promise<number[]> {
  // Get all districts in the province
  const provinceDistricts = await db.query.districts.findMany({
    where: eq(districts.provinceId, provinceId),
  });
  
  const districtIds = provinceDistricts.map(d => d.id);
  
  if (districtIds.length === 0) {
    return [];
  }
  
  // Get all facilities in those districts
  const provinceFacilities = await db.query.facilities.findMany({
    where: inArray(facilities.districtId, districtIds),
  });
  
  const provinceFacilityIds = provinceFacilities.map(f => f.id);
  
  // Filter by user's accessible facilities
  const accessibleIds = provinceFacilityIds.filter(id =>
    userContext.accessibleFacilityIds.includes(id)
  );
  
  console.log(`[Access Control] Province ${provinceId}:`, {
    districtIds,
    provinceFacilityIds,
    userAccessibleIds: userContext.accessibleFacilityIds,
    filteredIds: accessibleIds,
  });
  
  return accessibleIds;
}

/**
 * Get accessible facilities in a district
 * Filters by user's accessible facility IDs to enforce access control
 * 
 * @param userContext - User context with access control information
 * @param districtId - District ID to filter by
 * @returns Array of facility IDs in the district that user can access
 */
export async function getAccessibleFacilitiesInDistrict(
  userContext: UserContext,
  districtId: number
): Promise<number[]> {
  // Get all facilities in the district
  const districtFacilities = await db.query.facilities.findMany({
    where: eq(facilities.districtId, districtId),
  });
  
  const districtFacilityIds = districtFacilities.map(f => f.id);
  
  // Filter by user's accessible facilities
  const accessibleIds = districtFacilityIds.filter(id =>
    userContext.accessibleFacilityIds.includes(id)
  );
  
  return accessibleIds;
}

/**
 * Get accessible facilities for a specific facility and its children
 * Includes the facility itself and any child health centers
 * 
 * @param userContext - User context with access control information
 * @param facilityId - Facility ID to filter by
 * @returns Array of facility IDs (facility + children) that user can access
 */
export async function getAccessibleFacilitiesForFacility(
  userContext: UserContext,
  facilityId: number
): Promise<number[]> {
  // Get the facility and its children
  const childFacilities = await db.query.facilities.findMany({
    where: eq(facilities.parentFacilityId, facilityId),
  });
  
  const facilityIds = [facilityId, ...childFacilities.map(f => f.id)];
  
  // Filter by user's accessible facilities
  const accessibleIds = facilityIds.filter(id =>
    userContext.accessibleFacilityIds.includes(id)
  );
  
  return accessibleIds;
}

/**
 * Get all accessible facilities for country-wide scope
 * Returns user's accessible facility IDs (already filtered by role)
 * 
 * @param userContext - User context with access control information
 * @returns Array of all facility IDs user can access
 */
export async function getAccessibleFacilitiesForCountry(
  userContext: UserContext
): Promise<number[]> {
  return userContext.accessibleFacilityIds;
}

/**
 * Validate if user has access to a specific province
 * 
 * @param userContext - User context with access control information
 * @param provinceId - Province ID to validate
 * @returns True if user has access to the province
 */
export async function validateProvinceAccess(
  userContext: UserContext,
  provinceId: number
): Promise<boolean> {
  // Admin users have access to all provinces
  if (userContext.role === 'superadmin' || userContext.role === 'admin') {
    return true;
  }
  
  // Get facilities in the province
  const provinceFacilityIds = await getAccessibleFacilitiesInProvince(userContext, provinceId);
  
  // User has access if they have at least one accessible facility in the province
  return provinceFacilityIds.length > 0;
}

/**
 * Validate if user has access to a specific district
 * 
 * @param userContext - User context with access control information
 * @param districtId - District ID to validate
 * @returns True if user has access to the district
 */
export async function validateDistrictAccess(
  userContext: UserContext,
  districtId: number
): Promise<boolean> {
  // Admin users have access to all districts
  if (userContext.role === 'superadmin' || userContext.role === 'admin') {
    return true;
  }
  
  // Get facilities in the district
  const districtFacilityIds = await getAccessibleFacilitiesInDistrict(userContext, districtId);
  
  // User has access if they have at least one accessible facility in the district
  return districtFacilityIds.length > 0;
}

/**
 * Validate if user has access to a specific facility
 * 
 * @param userContext - User context with access control information
 * @param facilityId - Facility ID to validate
 * @returns True if user has access to the facility
 */
export async function validateFacilityAccess(
  userContext: UserContext,
  facilityId: number
): Promise<boolean> {
  // Admin users have access to all facilities
  if (userContext.role === 'superadmin' || userContext.role === 'admin') {
    return true;
  }
  
  // Check if facility is in user's accessible facilities
  return userContext.accessibleFacilityIds.includes(facilityId);
}

/**
 * Filter facility IDs to only those accessible by the user
 * 
 * @param userContext - User context with access control information
 * @param facilityIds - Array of facility IDs to filter
 * @returns Filtered array of accessible facility IDs
 */
export async function filterAccessibleFacilities(
  userContext: UserContext,
  facilityIds: number[]
): Promise<number[]> {
  // Admin users have access to all facilities
  if (userContext.role === 'superadmin' || userContext.role === 'admin') {
    return facilityIds;
  }
  
  // Filter to only accessible facilities
  return facilityIds.filter(id => userContext.accessibleFacilityIds.includes(id));
}

/**
 * Check if user has admin access
 * 
 * @param userContext - User context with role and permissions
 * @returns True if user is an admin
 */
export function isAdminUser(userContext: UserContext): boolean {
  return (
    userContext.role === 'superadmin' ||
    userContext.role === 'admin' ||
    userContext.permissions?.includes('admin_access')
  );
}

/**
 * Resolve scope filter to facility IDs without access control filtering
 * Used for admin users who can access any scope
 * 
 * @param scope - Scope level (country, province, district, facility)
 * @param scopeId - ID of the scope entity (required for province/district/facility)
 * @returns Array of all facility IDs matching the scope (no access filtering)
 */
export async function resolveScopeToFacilityIdsWithoutAccessControl(
  scope: 'country' | 'province' | 'district' | 'facility',
  scopeId: number
): Promise<number[]> {
  switch (scope) {
    case 'country':
      // Get all facilities in the country
      const allFacilities = await db.query.facilities.findMany();
      return allFacilities.map(f => f.id);
    
    case 'province':
      // Get all districts in the province
      const provinceDistricts = await db.query.districts.findMany({
        where: eq(districts.provinceId, scopeId),
      });
      const districtIds = provinceDistricts.map(d => d.id);
      
      if (districtIds.length === 0) {
        return [];
      }
      
      // Get all facilities in those districts
      const provinceFacilities = await db.query.facilities.findMany({
        where: inArray(facilities.districtId, districtIds),
      });
      return provinceFacilities.map(f => f.id);
    
    case 'district':
      // Get all facilities in the district
      const districtFacilities = await db.query.facilities.findMany({
        where: eq(facilities.districtId, scopeId),
      });
      return districtFacilities.map(f => f.id);
    
    case 'facility':
      // Get the facility and its children
      const childFacilities = await db.query.facilities.findMany({
        where: eq(facilities.parentFacilityId, scopeId),
      });
      return [scopeId, ...childFacilities.map(f => f.id)];
    
    default:
      return [];
  }
}

/**
 * Resolve scope filter to facility IDs
 * Main entry point for converting scope/scopeId into facility IDs
 * 
 * @param scope - Scope level (country, province, district, facility)
 * @param scopeId - ID of the scope entity (required for province/district/facility)
 * @param userContext - User context with access control information
 * @returns Array of facility IDs matching the scope and user's access
 */
export async function resolveScopeToFacilityIds(
  scope: 'country' | 'province' | 'district' | 'facility' | undefined,
  scopeId: number | undefined,
  userContext: UserContext
): Promise<number[]> {
  // No scope specified - use user's accessible facilities
  if (!scope) {
    return userContext.accessibleFacilityIds;
  }
  
  switch (scope) {
    case 'country':
      return getAccessibleFacilitiesForCountry(userContext);
    
    case 'province':
      if (!scopeId) {
        throw new Error('scopeId is required for province scope');
      }
      return getAccessibleFacilitiesInProvince(userContext, scopeId);
    
    case 'district':
      if (!scopeId) {
        throw new Error('scopeId is required for district scope');
      }
      return getAccessibleFacilitiesInDistrict(userContext, scopeId);
    
    case 'facility':
      if (!scopeId) {
        throw new Error('scopeId is required for facility scope');
      }
      return getAccessibleFacilitiesForFacility(userContext, scopeId);
    
    default:
      return userContext.accessibleFacilityIds;
  }
}
