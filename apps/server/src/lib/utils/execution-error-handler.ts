import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ApprovalError, ApprovalErrorFactory, isApprovalError, APPROVAL_ERROR_CODES } from '@/lib/errors/approval.errors';

/**
 * Enhanced error handler for execution endpoints
 * Provides detailed error context and logging for blocked execution attempts
 */
export class ExecutionErrorHandler {
  /**
   * Handle execution blocking errors with comprehensive logging and user feedback
   * @param c - Hono context
   * @param error - The error that occurred
   * @param planningId - The planning ID being executed (if available)
   * @param endpoint - The endpoint being accessed
   * @returns HTTPException with detailed error response
   */
  static handleExecutionError(
    c: Context,
    error: any,
    planningId?: number,
    endpoint?: string
  ): HTTPException {
    const logger = c.get('logger');
    const requestInfo = {
      endpoint: endpoint || c.req.url,
      method: c.req.method,
      planningId,
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      timestamp: new Date().toISOString()
    };

    // Handle ApprovalError specifically
    if (isApprovalError(error)) {
      logger?.warn({
        ...requestInfo,
        error: error.toJSON()
      }, 'Execution blocked by approval validation');

      return new HTTPException(error.statusCode as any, {
        message: error.message,
        cause: {
          ...error.toJSON(),
          requestInfo,
          helpText: this.getHelpText(error.code),
          supportedActions: this.getSupportedActions(error.code)
        }
      });
    }

    // Handle other types of errors
    logger?.error({
      ...requestInfo,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Unexpected error during execution validation');

    const validationError = ApprovalErrorFactory.validationError(
      `Execution validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      planningId
    );

    return new HTTPException(validationError.statusCode as any, {
      message: validationError.message,
      cause: {
        ...validationError.toJSON(),
        requestInfo,
        helpText: 'An unexpected error occurred during execution validation.',
        supportedActions: ['Retry request', 'Contact system administrator']
      }
    });
  }

  /**
   * Create a detailed execution blocked error response
   * @param planningId - The planning ID being executed
   * @param currentStatus - Current approval status of the plan
   * @param endpoint - The endpoint being accessed
   * @param context - Additional context information
   * @returns ApprovalError with execution blocking details
   */
  static createExecutionBlockedError(
    planningId: number,
    currentStatus: string,
    endpoint: string,
    context?: Record<string, any>
  ): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.EXECUTION_BLOCKED,
      'Execution blocked: Plan approval required',
      400,
      {
        code: APPROVAL_ERROR_CODES.EXECUTION_BLOCKED,
        planningId,
        currentStatus,
        requiredStatus: 'APPROVED',
        reason: `Plan has not been approved for execution. Current status: ${currentStatus}`,
        context: {
          endpoint,
          message: 'This plan has not been approved for execution. Only approved plans can proceed to execution phases.',
          requiredStatus: 'APPROVED',
          currentStatus,
          executionAttempt: {
            endpoint,
            timestamp: new Date().toISOString(),
            blocked: true
          },
          ...context
        }
      }
    );
  }

  /**
   * Log execution attempt for audit purposes
   * @param c - Hono context
   * @param planningId - The planning ID being executed
   * @param success - Whether execution was allowed
   * @param reason - Reason for blocking (if blocked)
   * @param additionalContext - Additional context for logging
   */
  static logExecutionAttempt(
    c: Context,
    planningId: number,
    success: boolean,
    reason?: string,
    additionalContext?: Record<string, any>
  ): void {
    const logger = c.get('logger');
    
    const logData = {
      planningId,
      endpoint: c.req.url,
      method: c.req.method,
      success,
      reason,
      timestamp: new Date().toISOString(),
      auditType: 'execution_attempt',
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      ...additionalContext
    };

    if (success) {
      logger?.info(logData, 'Execution attempt allowed - plan approved');
    } else {
      logger?.warn(logData, 'Execution attempt blocked - plan not approved');
    }
  }

  /**
   * Get contextual help text based on error code
   * @param errorCode - The approval error code
   * @returns Help text for the user
   */
  private static getHelpText(errorCode: string): string {
    switch (errorCode) {
      case APPROVAL_ERROR_CODES.EXECUTION_BLOCKED:
        return 'This plan must be approved by an administrator before it can be executed. Contact your administrator to request approval.';
      
      case APPROVAL_ERROR_CODES.PLAN_NOT_FOUND:
        return 'The specified plan could not be found. Please verify the plan ID and try again.';
      
      case APPROVAL_ERROR_CODES.PLANNING_ID_REQUIRED:
        return 'This operation requires a valid planning ID. Please provide a planning ID in your request.';
      
      case APPROVAL_ERROR_CODES.INVALID_STATUS_TRANSITION:
        return 'The plan is in a status that does not allow this operation. Check the current plan status and required workflow.';
      
      default:
        return 'An error occurred during execution validation. Please contact your system administrator for assistance.';
    }
  }

  /**
   * Get supported actions based on error code
   * @param errorCode - The approval error code
   * @returns Array of supported actions for the user
   */
  private static getSupportedActions(errorCode: string): string[] {
    switch (errorCode) {
      case APPROVAL_ERROR_CODES.EXECUTION_BLOCKED:
        return [
          'View plan details',
          'Check approval status',
          'Contact administrator for approval',
          'Submit plan for review'
        ];
      
      case APPROVAL_ERROR_CODES.PLAN_NOT_FOUND:
        return [
          'Verify plan ID',
          'Check plan exists',
          'Create new plan',
          'Contact support'
        ];
      
      case APPROVAL_ERROR_CODES.PLANNING_ID_REQUIRED:
        return [
          'Provide planning ID in request',
          'Check API documentation',
          'Verify request format'
        ];
      
      default:
        return [
          'Retry request',
          'Check system status',
          'Contact system administrator'
        ];
    }
  }

  /**
   * Create a standardized error response for API endpoints
   * @param error - The ApprovalError to format
   * @param requestContext - Additional request context
   * @returns Formatted error response object
   */
  static formatErrorResponse(error: ApprovalError, requestContext?: Record<string, any>) {
    return {
      error: true,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      planningId: error.planningId,
      currentStatus: error.currentStatus,
      details: {
        ...error.details,
        requestContext,
        timestamp: new Date().toISOString(),
        helpText: this.getHelpText(error.code),
        supportedActions: this.getSupportedActions(error.code)
      }
    };
  }

  /**
   * Validate planning ID from request and throw appropriate error if missing
   * @param planningId - The planning ID to validate
   * @throws ApprovalError if planning ID is missing or invalid
   */
  static validatePlanningId(planningId: any): number {
    if (!planningId) {
      throw ApprovalErrorFactory.planningIdRequired();
    }

    const parsedId = typeof planningId === 'string' ? parseInt(planningId) : planningId;
    
    if (isNaN(parsedId) || parsedId <= 0) {
      throw new ApprovalError(
        APPROVAL_ERROR_CODES.MISSING_PLANNING_ID,
        'Invalid planning ID provided',
        400,
        {
          code: APPROVAL_ERROR_CODES.MISSING_PLANNING_ID,
          reason: 'Planning ID must be a positive integer',
          context: { providedValue: planningId }
        }
      );
    }

    return parsedId;
  }
}

/**
 * Middleware helper to extract and validate planning ID from various request sources
 * @param c - Hono context
 * @returns Validated planning ID or throws ApprovalError
 */
export async function extractPlanningId(c: Context): Promise<number> {
  let planningId: any;

  // Try to get planningId from request body first
  try {
    const body = await c.req.json() as Record<string, any>;
    planningId = body.planningId || body.planning_id;
  } catch {
    // If body parsing fails, try query parameters
    const query = c.req.query();
    planningId = query.planningId || query.planning_id;
  }

  // If no planningId found, check URL parameters
  if (!planningId) {
    const params = c.req.param() as Record<string, any>;
    planningId = params.planningId || params.planning_id || params.id;
  }

  return ExecutionErrorHandler.validatePlanningId(planningId);
}