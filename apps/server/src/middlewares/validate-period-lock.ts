import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { periodLockService } from '@/lib/services/period-lock-service';

/**
 * Options for period lock validation middleware
 */
export interface PeriodLockValidationOptions {
  /**
   * How to extract reportingPeriodId from the request
   * - 'body': Extract from request body (default for POST/PUT/PATCH)
   * - 'query': Extract from query parameters (for GET requests)
   * - 'param': Extract from URL parameters
   */
  reportingPeriodIdSource?: 'body' | 'query' | 'param';
  
  /**
   * How to extract projectId from the request
   */
  projectIdSource?: 'body' | 'query' | 'param';
  
  /**
   * How to extract facilityId from the request
   */
  facilityIdSource?: 'body' | 'query' | 'param';
  
  /**
   * Custom parameter names if different from defaults
   */
  paramNames?: {
    reportingPeriodId?: string;
    projectId?: string;
    facilityId?: string;
  };
}

/**
 * Period Lock Validation Middleware
 * 
 * Validates that edit operations are not performed on locked reporting periods.
 * This middleware should be applied to all endpoints that modify planning or
 * execution data to prevent back-dating of approved financial reports.
 * 
 * The middleware:
 * 1. Extracts reportingPeriodId, projectId, and facilityId from the request
 * 2. Calls periodLockService.validateEditOperation() to check lock status
 * 3. Returns 403 Forbidden if period is locked and user lacks override permission
 * 4. Logs failed edit attempts for audit purposes
 * 
 * @param options - Configuration for extracting IDs from request
 * @returns Hono middleware function
 * 
 * @example
 * // For POST/PUT/PATCH endpoints with IDs in body
 * app.post('/planning', validatePeriodLock(), createPlanning);
 * 
 * @example
 * // For endpoints with IDs in query parameters
 * app.get('/data', validatePeriodLock({ 
 *   reportingPeriodIdSource: 'query',
 *   projectIdSource: 'query',
 *   facilityIdSource: 'query'
 * }), getData);
 * 
 * @example
 * // For endpoints with custom parameter names
 * app.put('/update', validatePeriodLock({
 *   paramNames: {
 *     reportingPeriodId: 'periodId',
 *     projectId: 'proj',
 *     facilityId: 'facility'
 *   }
 * }), updateData);
 */
export function validatePeriodLock(options: PeriodLockValidationOptions = {}) {
  return createMiddleware(async (c, next) => {
    try {
      // Get user from context (assumes auth middleware ran first)
      const user = c.get('user');
      
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      // Default sources: body for POST/PUT/PATCH, query for GET
      const method = c.req.method;
      const defaultSource = ['POST', 'PUT', 'PATCH'].includes(method) ? 'body' : 'query';
      
      const reportingPeriodIdSource = options.reportingPeriodIdSource || defaultSource;
      const projectIdSource = options.projectIdSource || defaultSource;
      const facilityIdSource = options.facilityIdSource || defaultSource;
      
      // Default parameter names
      const paramNames = {
        reportingPeriodId: options.paramNames?.reportingPeriodId || 'reportingPeriodId',
        projectId: options.paramNames?.projectId || 'projectId',
        facilityId: options.paramNames?.facilityId || 'facilityId',
      };

      // Extract IDs from request
      let reportingPeriodId: number | undefined;
      let projectId: number | undefined;
      let facilityId: number | undefined;

      // Helper function to extract value from different sources
      const extractValue = async (source: 'body' | 'query' | 'param', paramName: string): Promise<any> => {
        switch (source) {
          case 'body': {
            const body = await c.req.json();
            return body[paramName];
          }
          case 'query': {
            const query = c.req.query();
            return query[paramName];
          }
          case 'param': {
            return c.req.param(paramName);
          }
        }
      };

      // Extract reportingPeriodId
      const reportingPeriodIdValue = await extractValue(
        reportingPeriodIdSource,
        paramNames.reportingPeriodId
      );
      reportingPeriodId = reportingPeriodIdValue ? parseInt(reportingPeriodIdValue) : undefined;

      // Extract projectId
      const projectIdValue = await extractValue(
        projectIdSource,
        paramNames.projectId
      );
      projectId = projectIdValue ? parseInt(projectIdValue) : undefined;

      // Extract facilityId
      const facilityIdValue = await extractValue(
        facilityIdSource,
        paramNames.facilityId
      );
      facilityId = facilityIdValue ? parseInt(facilityIdValue) : undefined;

      // Validate that all required IDs are present
      if (!reportingPeriodId || !projectId || !facilityId) {
        console.warn('Period lock validation skipped: missing required IDs', {
          reportingPeriodId,
          projectId,
          facilityId,
          endpoint: c.req.url,
          method: c.req.method,
        });
        
        // Skip validation if IDs are missing - let the handler deal with validation
        await next();
        return;
      }

      // Convert user.id to number (auth returns string)
      const userId = parseInt(user.id);

      // Validate edit operation against period lock
      const validationResult = await periodLockService.validateEditOperation(
        reportingPeriodId,
        projectId,
        facilityId,
        userId
      );

      if (!validationResult.allowed) {
        console.warn('Period lock validation failed', {
          userId,
          userRole: (user as any).role,
          reportingPeriodId,
          projectId,
          facilityId,
          reason: validationResult.reason,
          endpoint: c.req.url,
          method: c.req.method,
        });

        throw new HTTPException(403, {
          message: validationResult.reason || 'This reporting period is locked',
        });
      }

      // Validation passed - continue to handler
      console.log('Period lock validation passed', {
        userId,
        reportingPeriodId,
        projectId,
        facilityId,
        endpoint: c.req.url,
      });

      await next();
    } catch (error) {
      // Re-throw HTTPException as-is
      if (error instanceof HTTPException) {
        throw error;
      }

      // Log unexpected errors
      console.error('Error in period lock validation middleware:', error);
      
      throw new HTTPException(500, {
        message: 'Internal server error during period lock validation',
      });
    }
  });
}

/**
 * Convenience middleware for endpoints with IDs in request body
 * This is the most common case for POST/PUT/PATCH endpoints
 */
export const validatePeriodLockFromBody = validatePeriodLock({
  reportingPeriodIdSource: 'body',
  projectIdSource: 'body',
  facilityIdSource: 'body',
});

/**
 * Convenience middleware for endpoints with IDs in query parameters
 * Useful for GET endpoints that need period lock validation
 */
export const validatePeriodLockFromQuery = validatePeriodLock({
  reportingPeriodIdSource: 'query',
  projectIdSource: 'query',
  facilityIdSource: 'query',
});

/**
 * Convenience middleware for endpoints with IDs in URL parameters
 * Less common but useful for RESTful endpoints
 */
export const validatePeriodLockFromParams = validatePeriodLock({
  reportingPeriodIdSource: 'param',
  projectIdSource: 'param',
  facilityIdSource: 'param',
});
