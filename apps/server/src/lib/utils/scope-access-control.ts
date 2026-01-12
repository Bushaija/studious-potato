import { UserContext, hasAdminAccess } from "./get-user-facility";

/**
 * Query parameters for scope access validation
 */
export interface ScopeQueryParams {
  scope?: 'district' | 'provincial' | 'country';
  districtId?: number;
  provinceId?: number;
}

/**
 * Scope metadata details returned in API responses
 */
export interface ScopeDetails {
  districtId?: number;
  districtName?: string;
  districtIds?: number[];
  districtNames?: string[];
  provinceId?: number;
  provinceName?: string;
  provinceCount?: number;
  districtCount?: number;
}

/**
 * Result of scope access validation
 */
export interface ScopeAccessValidation {
  allowed: boolean;
  message?: string;
}

/**
 * Validate that a user has permission to access data at the requested scope
 * 
 * Access rules:
 * - Accountants can only access district scope for their assigned district(s)
 * - Administrators can access all scopes (district, provincial, country)
 * - Provincial scope requires a provinceId parameter
 * - Accountants cannot access districts outside their assignment
 * 
 * @param scope - The requested organizational scope
 * @param userContext - The user's context including role and district assignment
 * @param queryParams - Query parameters including optional districtId and provinceId
 * @returns Validation result with allowed flag and optional error message
 */
export function validateScopeAccess(
  scope: 'district' | 'provincial' | 'country',
  userContext: UserContext,
  queryParams: ScopeQueryParams
): ScopeAccessValidation {
  const isAdmin = hasAdminAccess(userContext.role, userContext.permissions);
  
  // Accountants can only access district scope
  if (!isAdmin) {
    if (scope !== 'district') {
      return {
        allowed: false,
        message: `Access denied: ${userContext.role} role can only access district scope`
      };
    }
    
    // Validate accountant cannot access other districts
    if (queryParams.districtId && 
        userContext.districtId && 
        queryParams.districtId !== userContext.districtId) {
      return {
        allowed: false,
        message: "Access denied: cannot access data from other districts"
      };
    }
    
    return { allowed: true };
  }
  
  // Admins can access all scopes
  // Provincial scope requires provinceId
  if (scope === 'provincial' && !queryParams.provinceId) {
    return {
      allowed: false,
      message: "provinceId is required for provincial scope"
    };
  }
  
  return { allowed: true };
}
