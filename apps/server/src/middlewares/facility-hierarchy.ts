import { createMiddleware } from 'hono/factory';
import { FacilityHierarchyService } from '@/api/services/facility-hierarchy.service';

// Extend the Hono context with facility hierarchy information
declare module 'hono' {
  interface ContextVariableMap {
    accessibleFacilityIds: number[];
    userFacility: number | null;
    userRole: string | null;
  }
}

/**
 * Middleware that computes accessible facility IDs and injects into context
 * Runs after authentication middleware
 * 
 * This middleware:
 * - Gets the authenticated user from context (set by auth middleware)
 * - Computes accessible facility IDs based on user role and facility
 * - Injects accessibleFacilityIds, userFacility, and userRole into request context
 * 
 * Access rules:
 * - Hospital DAF/DG users: own facility + all child health centers in same district
 * - Health center users: only own facility
 * - Admin/Superadmin: all facilities
 */
export const facilityHierarchyMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');

  // If no user is authenticated, set empty context and continue
  // This allows the middleware to run on all routes without breaking unauthenticated endpoints
  if (!user || !user.id) {
    c.set('accessibleFacilityIds', []);
    c.set('userFacility', null);
    c.set('userRole', null);
    await next();
    return;
  }

  try {
    // Get accessible facility IDs for the user
    const accessibleFacilityIds = await FacilityHierarchyService.getAccessibleFacilityIds(
      parseInt(user.id)
    );

    // Inject hierarchy context into request
    c.set('accessibleFacilityIds', accessibleFacilityIds);
    c.set('userFacility', user.facilityId || null);
    c.set('userRole', user.role || null);

    await next();
  } catch (error) {
    // Log error but don't block the request
    // Individual route handlers can decide how to handle missing hierarchy context
    console.error('Facility hierarchy middleware error:', error);
    
    // Set empty context on error
    c.set('accessibleFacilityIds', []);
    c.set('userFacility', user.facilityId || null);
    c.set('userRole', user.role || null);
    
    await next();
  }
});
