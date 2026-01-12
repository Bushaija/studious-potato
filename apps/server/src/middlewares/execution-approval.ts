import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { approvalService } from '@/lib/services/approval.service';
import { ApprovalError, ApprovalErrorFactory, isApprovalError } from '@/lib/errors/approval.errors';

/**
 * Middleware to validate approval status for execution endpoints
 * Blocks execution of unapproved plans and provides clear error responses
 */
export function validateApprovalStatus() {
  return createMiddleware(async (c, next) => {
    const logger = c.get('logger');
    let planningId: number | undefined;

    try {
      // Extract planningId from request body or query parameters
      // Try to get planningId from request body first
      try {
        const body = await c.req.json() as Record<string, any>;
        planningId = body.planningId || body.planning_id;
      } catch {
        // If body parsing fails, try query parameters
        const query = c.req.query();
        planningId = query.planningId ? parseInt(query.planningId) : 
                    query.planning_id ? parseInt(query.planning_id) : undefined;
      }

      // If no planningId found, check URL parameters
      if (!planningId) {
        const params = c.req.param() as Record<string, any>;
        planningId = params.planningId ? parseInt(params.planningId) : 
                    params.planning_id ? parseInt(params.planning_id) : undefined;
      }

      // If still no planningId, this might not be a plan-related execution
      // Allow the request to proceed (some execution endpoints might not require plan validation)
      if (!planningId) {
        logger?.info('No planning ID found in request, skipping approval validation');
        await next();
        return;
      }

      // Log execution attempt for audit purposes
      logger?.info({
        planningId,
        endpoint: c.req.url,
        method: c.req.method,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
      }, 'Execution attempt on plan - validating approval status');

      // Validate execution permission using approval service
      const permissionResult = await approvalService.validateExecutionPermission(planningId);

      if (!permissionResult.allowed) {
        // Log blocked execution attempt
        logger?.warn({
          planningId,
          currentStatus: permissionResult.currentStatus,
          reason: permissionResult.reason,
          endpoint: c.req.url,
          method: c.req.method
        }, 'Execution blocked: Plan not approved');

        // Create detailed error response using ApprovalError
        const error = ApprovalErrorFactory.executionBlocked(
          planningId,
          permissionResult.currentStatus,
          permissionResult.reason
        );

        throw new HTTPException(error.statusCode as any, {
          message: error.message,
          cause: error.toJSON()
        });
      }

      // Log successful validation
      logger?.info({
        planningId,
        approvalStatus: permissionResult.currentStatus,
        endpoint: c.req.url
      }, 'Execution approved: Plan validation successful');

      // Add approval validation info to context for use in route handlers
      c.set('approvalValidation', {
        validated: true,
        planningId,
        approvalStatus: permissionResult.currentStatus
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      // Handle ApprovalError specifically
      if (isApprovalError(error)) {
        logger?.error({
          planningId,
          code: error.code,
          message: error.message,
          endpoint: c.req.url
        }, 'Approval validation failed');

        throw new HTTPException(error.statusCode as any, {
          message: error.message,
          cause: error.toJSON()
        });
      }

      // Handle unexpected errors
      logger?.error({
        planningId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: c.req.url
      }, 'Unexpected error in approval validation middleware');

      const validationError = ApprovalErrorFactory.validationError(
        `Internal server error during approval validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        planningId
      );

      throw new HTTPException(validationError.statusCode as any, {
        message: validationError.message,
        cause: validationError.toJSON()
      });
    }
  });
}

/**
 * Middleware specifically for execution endpoints that require a planningId
 * This version requires planningId to be present and throws an error if not found
 */
export function requireApprovedPlan() {
  return createMiddleware(async (c, next) => {
    const logger = c.get('logger');
    let planningId: number | undefined;

    try {
      // Extract planningId from request body or query parameters
      // Try to get planningId from request body first
      try {
        const body = await c.req.json() as Record<string, any>;
        planningId = body.planningId || body.planning_id;
      } catch {
        // If body parsing fails, try query parameters
        const query = c.req.query();
        planningId = query.planningId ? parseInt(query.planningId) : 
                    query.planning_id ? parseInt(query.planning_id) : undefined;
      }

      // If no planningId found, check URL parameters
      if (!planningId) {
        const params = c.req.param() as Record<string, any>;
        planningId = params.planningId ? parseInt(params.planningId) : 
                    params.planning_id ? parseInt(params.planning_id) : undefined;
      }

      // Require planningId for this middleware
      if (!planningId) {
        logger?.warn({
          endpoint: c.req.url,
          method: c.req.method
        }, 'Execution blocked: Missing required planning ID');

        const error = ApprovalErrorFactory.planningIdRequired();
        throw new HTTPException(error.statusCode as any, {
          message: error.message,
          cause: error.toJSON()
        });
      }

      // Log execution attempt for audit purposes
      logger?.info({
        planningId,
        endpoint: c.req.url,
        method: c.req.method,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
      }, 'Required execution attempt on plan - validating approval status');

      // Validate execution permission using approval service
      const permissionResult = await approvalService.validateExecutionPermission(planningId);

      if (!permissionResult.allowed) {
        // Log blocked execution attempt with detailed context
        logger?.warn({
          planningId,
          currentStatus: permissionResult.currentStatus,
          reason: permissionResult.reason,
          endpoint: c.req.url,
          method: c.req.method,
          requiresApproval: true
        }, 'Required execution blocked: Plan not approved');

        // Create detailed error response using ApprovalError
        const error = ApprovalErrorFactory.executionBlocked(
          planningId,
          permissionResult.currentStatus,
          permissionResult.reason
        );

        throw new HTTPException(error.statusCode as any, {
          message: error.message,
          cause: error.toJSON()
        });
      }

      // Log successful validation
      logger?.info({
        planningId,
        approvalStatus: permissionResult.currentStatus,
        endpoint: c.req.url,
        requiresApproval: true
      }, 'Required execution approved: Plan validation successful');

      // Add approval validation info to context for use in route handlers
      c.set('approvalValidation', {
        validated: true,
        planningId,
        approvalStatus: permissionResult.currentStatus
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      // Handle ApprovalError specifically
      if (isApprovalError(error)) {
        logger?.error({
          planningId,
          code: error.code,
          message: error.message,
          endpoint: c.req.url,
          requiresApproval: true
        }, 'Required approval validation failed');

        throw new HTTPException(error.statusCode as any, {
          message: error.message,
          cause: error.toJSON()
        });
      }

      // Handle unexpected errors
      logger?.error({
        planningId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: c.req.url,
        requiresApproval: true
      }, 'Unexpected error in required approved plan middleware');

      const validationError = ApprovalErrorFactory.validationError(
        `Internal server error during required approval validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        planningId
      );

      throw new HTTPException(validationError.statusCode as any, {
        message: validationError.message,
        cause: validationError.toJSON()
      });
    }
  });
}

/**
 * Utility function to validate approval status in route handlers
 * @param planningId - The planning ID to validate
 * @returns Promise<boolean> indicating if execution is allowed
 * @throws ApprovalError for validation failures
 */
export async function isExecutionAllowed(planningId: number): Promise<boolean> {
  try {
    const result = await approvalService.validateExecutionPermission(planningId);
    return result.allowed;
  } catch (error) {
    if (isApprovalError(error)) {
      // Re-throw ApprovalErrors for proper handling
      throw error;
    }
    
    console.error('Error checking execution permission:', error);
    throw ApprovalErrorFactory.validationError(
      `Failed to check execution permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      planningId
    );
  }
}

/**
 * Utility function to get detailed approval status for a plan
 * @param planningId - The planning ID to check
 * @returns Promise with detailed approval information
 * @throws ApprovalError for validation failures
 */
export async function getApprovalStatus(planningId: number) {
  try {
    return await approvalService.validateExecutionPermission(planningId);
  } catch (error) {
    if (isApprovalError(error)) {
      // Re-throw ApprovalErrors for proper handling
      throw error;
    }
    
    console.error('Error getting approval status:', error);
    throw ApprovalErrorFactory.validationError(
      `Failed to get approval status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      planningId
    );
  }
}

/**
 * Utility function to log execution attempts for audit purposes
 * @param planningId - The planning ID being executed
 * @param endpoint - The endpoint being accessed
 * @param method - The HTTP method
 * @param success - Whether the execution was allowed
 * @param reason - Reason for blocking (if blocked)
 * @param logger - Logger instance
 */
export function logExecutionAttempt(
  planningId: number,
  endpoint: string,
  method: string,
  success: boolean,
  reason?: string,
  logger?: any
) {
  const logData = {
    planningId,
    endpoint,
    method,
    success,
    reason,
    timestamp: new Date().toISOString(),
    auditType: 'execution_attempt'
  };

  if (success) {
    logger?.info(logData, 'Execution attempt allowed');
  } else {
    logger?.warn(logData, 'Execution attempt blocked');
  }
}

/**
 * Enhanced error response formatter for execution blocking
 * @param error - The ApprovalError to format
 * @param context - Additional context for debugging
 * @returns Formatted error response
 */
export function formatExecutionBlockedError(error: ApprovalError, context?: Record<string, any>) {
  return {
    error: true,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    planningId: error.planningId,
    currentStatus: error.currentStatus,
    details: {
      ...error.details,
      context,
      timestamp: new Date().toISOString(),
      helpText: 'Contact an administrator to approve this plan before attempting execution.',
      supportedActions: ['View plan details', 'Request approval', 'Contact administrator']
    }
  };
}