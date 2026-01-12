import { SQL, eq, inArray } from "drizzle-orm";
import { db } from "@/api/db";
import { facilities, districts, provinces } from "@/api/db/schema";
import { UserContext, hasAdminAccess } from "./get-user-facility";
import type { ScopeQueryParams } from "./scope-access-control";

// Re-export for convenience
export type { ScopeQueryParams };

/**
 * Custom error class for scope filter errors
 * Provides structured error information including scope type and additional details
 */
export class ScopeFilterError extends Error {
  constructor(
    message: string,
    public scope: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScopeFilterError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScopeFilterError);
    }
  }
}

/**
 * Build district scope filter
 * Filters facilities to those in the user's assigned district(s) or admin-specified district
 * 
 * @param userContext - The user's context including district assignment
 * @param queryParams - Query parameters including optional districtId
 * @returns SQL filter condition or null if no filter needed
 */
export function buildDistrictScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): SQL | null {
  const isAdmin = hasAdminAccess(userContext.role, userContext.permissions);
  
  // If admin specifies districtId, use that (takes precedence)
  if (queryParams.districtId && isAdmin) {
    return eq(facilities.districtId, queryParams.districtId);
  }
  
  // If user has districtId (accountant), filter to their district(s)
  if (userContext.districtId && !isAdmin) {
    return eq(facilities.districtId, userContext.districtId);
  }
  
  return null; // No district filter (admin viewing all districts)
}

/**
 * Build provincial scope filter
 * Filters facilities to those in districts within the specified province
 * 
 * @param userContext - The user's context
 * @param queryParams - Query parameters including required provinceId
 * @returns SQL filter condition
 * @throws ScopeFilterError if provinceId is missing or invalid
 */
export async function buildProvincialScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): Promise<SQL> {
  const startTime = Date.now();
  
  // Validate provinceId is provided
  if (!queryParams.provinceId) {
    throw new ScopeFilterError(
      "provinceId is required for provincial scope",
      "provincial",
      { missingParameter: "provinceId" }
    );
  }
  
  // Validate province exists
  const province = await db.query.provinces.findFirst({
    where: eq(provinces.id, queryParams.provinceId)
  });
  
  if (!province) {
    // Get all valid province IDs for error details
    const allProvinces = await db.select({ id: provinces.id }).from(provinces);
    const validProvinceIds = allProvinces.map(p => p.id);
    
    throw new ScopeFilterError(
      `Invalid provinceId: province ${queryParams.provinceId} not found`,
      "provincial",
      { 
        provinceId: queryParams.provinceId,
        validProvinceIds 
      }
    );
  }
  
  // Single optimized query to get all district IDs in the province
  const provinceDistricts = await db
    .select({ id: districts.id })
    .from(districts)
    .where(eq(districts.provinceId, queryParams.provinceId));
  
  const districtIds = provinceDistricts.map(d => d.id);
  
  // Log performance
  const executionTime = Date.now() - startTime;
  console.log(`[SCOPE-FILTER] Provincial scope filter built in ${executionTime}ms for province ${queryParams.provinceId} (${districtIds.length} districts)`);
  
  if (executionTime > 100) {
    console.warn(`[SCOPE-FILTER] [PERFORMANCE] Slow scope filter construction: ${executionTime}ms for provincial scope`);
  }
  
  if (districtIds.length === 0) {
    // No districts in this province - return filter that matches nothing
    console.warn(`[SCOPE-FILTER] No districts found for province ${queryParams.provinceId}`);
    return eq(facilities.id, -1);
  }
  
  // Simple, efficient filter: facilities in any of these districts
  // This includes both hospitals and health centers directly assigned to districts in the province
  return inArray(facilities.districtId, districtIds);
}

/**
 * Build country scope filter
 * Returns simple active filter for all facilities with no geographic restrictions
 * 
 * For country scope, we want ALL active facilities regardless of location.
 * The status field defaults to 'ACTIVE' for all facilities in the system.
 * We filter by status='ACTIVE' to exclude any inactive or decommissioned facilities.
 * 
 * This ensures that:
 * - All facilities across all 5 provinces (eastern, kigali, northern, southern, western) are included
 * - No geographic restrictions are applied (no district or province filtering)
 * - Only active facilities are returned (excludes inactive/decommissioned facilities)
 * 
 * @param userContext - The user's context (not used for country scope)
 * @param queryParams - Query parameters (not used for country scope)
 * @returns SQL filter condition for active facilities
 */
export function buildCountryScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): SQL {
  // For country scope, include ALL active facilities nationwide
  // No geographic filtering - this covers all provinces and districts
  // The status='ACTIVE' filter excludes inactive or decommissioned facilities
  console.log('[SCOPE-FILTER] Country scope filter: including all active facilities across all provinces');
  
  return eq(facilities.status, 'ACTIVE');
}

/**
 * Main scope filter builder using strategy pattern
 * Delegates to scope-specific filter builders based on scope type
 * 
 * @param scope - The organizational scope ('district', 'provincial', or 'country')
 * @param userContext - The user's context including role and permissions
 * @param queryParams - Query parameters including scope-specific parameters
 * @returns SQL filter condition or null if no filter needed
 * @throws ScopeFilterError if scope type is unsupported or required parameters are missing
 */
export async function buildScopeFilter(
  scope: 'district' | 'provincial' | 'country',
  userContext: UserContext,
  queryParams: ScopeQueryParams
): Promise<SQL | null> {
  try {
    // Validate scope type before processing
    const supportedScopes = ['district', 'provincial', 'country'];
    if (!supportedScopes.includes(scope)) {
      throw new ScopeFilterError(
        `Unsupported scope: ${scope}`,
        scope,
        { supportedScopes }
      );
    }

    // Delegate to scope-specific filter builder
    switch (scope) {
      case 'district':
        return buildDistrictScopeFilter(userContext, queryParams);
      
      case 'provincial':
        return await buildProvincialScopeFilter(userContext, queryParams);
      
      case 'country':
        return buildCountryScopeFilter(userContext, queryParams);
      
      default:
        // This should never be reached due to validation above, but TypeScript requires it
        throw new ScopeFilterError(
          `Unsupported scope: ${scope}`,
          scope,
          { supportedScopes }
        );
    }
  } catch (error) {
    // Log detailed error context for debugging
    console.error('[SCOPE-FILTER] Error building scope filter:', {
      scope,
      userContext: {
        userId: userContext.userId,
        role: userContext.role,
        districtId: userContext.districtId
      },
      queryParams: {
        scope: queryParams.scope,
        districtId: queryParams.districtId,
        provinceId: queryParams.provinceId
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    // Re-throw ScopeFilterError as-is (already has proper context)
    if (error instanceof ScopeFilterError) {
      throw error;
    }
    
    // Wrap non-ScopeFilterError errors in ScopeFilterError for consistent error handling
    throw new ScopeFilterError(
      `Failed to build ${scope} scope filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      scope,
      { 
        originalError: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    );
  }
}
