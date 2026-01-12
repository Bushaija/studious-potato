/**
 * Role-Based Scope Service
 * 
 * Applies role-based access control to dashboard filters.
 * Ensures users only see data they have permission to access based on their role
 * and organizational assignment.
 */

import type { UserContext } from '@/lib/utils/get-user-facility';
import type { DashboardFilters } from './unified-dashboard.service';
import { db } from '@/db';
import { facilities } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Apply role-based access control to dashboard filters
 * Ensures users only see data they have permission to access
 * 
 * @param filters - Dashboard filters from request
 * @param userContext - User context with role and facility information
 * @returns Modified filters with role-based scope restrictions applied
 */
export async function applyRoleBasedScope(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<DashboardFilters> {
  // Admin users can access any scope, but we still need to resolve scope to facility IDs
  // They bypass access restrictions, not scope resolution
  if (isAdminUser(userContext)) {
    // If admin specified a scope, resolve it to facility IDs
    if (filters.scope) {
      const { resolveScopeToFacilityIdsWithoutAccessControl } = await import('./access-control.service');
      
      // Country scope doesn't need scopeId
      if (filters.scope === 'country') {
        const facilityIds = await resolveScopeToFacilityIdsWithoutAccessControl(
          filters.scope,
          0 // dummy value for country scope
        );
        return {
          ...filters,
          facilityIds,
        };
      }
      
      // Other scopes require scopeId
      if (filters.scopeId) {
        const facilityIds = await resolveScopeToFacilityIdsWithoutAccessControl(
          filters.scope,
          filters.scopeId
        );
        return {
          ...filters,
          facilityIds,
        };
      }
    }
    // No scope specified - return all accessible facilities
    return filters;
  }
  
  // Hospital accountants: their hospital + child health centers
  if (userContext.role === 'hospital_accountant') {
    return {
      ...filters,
      facilityIds: userContext.accessibleFacilityIds,
      scope: 'facility',
      scopeId: userContext.facilityId,
    };
  }
  
  // District accountants: all facilities in their district
  if (userContext.role === 'district_accountant' && userContext.districtId) {
    return {
      ...filters,
      scope: 'district',
      scopeId: userContext.districtId,
      facilityIds: userContext.accessibleFacilityIds,
    };
  }
  
  // Provincial accountants: all facilities in their province
  if (userContext.role === 'provincial_accountant') {
    const userFacility = await db.query.facilities.findFirst({
      where: eq(facilities.id, userContext.facilityId),
      with: { district: true },
    });
    
    if (userFacility?.district?.provinceId) {
      // Fetch all facilities in the province
      const provinceFacilities = await db.query.facilities.findMany({
        with: { district: true },
      });
      
      const provinceFacilityIds = provinceFacilities
        .filter(f => f.district?.provinceId === userFacility.district.provinceId)
        .map(f => f.id);
      
      return {
        ...filters,
        scope: 'province',
        scopeId: userFacility.district.provinceId,
        facilityIds: provinceFacilityIds,
      };
    }
  }
  
  // Default: restrict to user's accessible facilities
  return {
    ...filters,
    facilityIds: userContext.accessibleFacilityIds,
  };
}

/**
 * Check if user has admin access
 * Admin users can access all data without restrictions
 * 
 * @param userContext - User context with role and permissions
 * @returns True if user is an admin
 */
function isAdminUser(userContext: UserContext): boolean {
  return (
    userContext.role === 'superadmin' ||
    userContext.role === 'admin' ||
    userContext.permissions?.includes('admin_access')
  );
}
