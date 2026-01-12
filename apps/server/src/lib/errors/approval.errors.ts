import { APIError } from '@/lib/types';

/**
 * Approval-specific error codes for structured error handling
 */
export const APPROVAL_ERROR_CODES = {
  // Plan validation errors
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_ALREADY_PROCESSED: 'PLAN_ALREADY_PROCESSED',
  
  // Status transition errors
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  STATUS_CHANGE_NOT_ALLOWED: 'STATUS_CHANGE_NOT_ALLOWED',
  
  // Permission and authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  UNAUTHORIZED_APPROVAL_ACTION: 'UNAUTHORIZED_APPROVAL_ACTION',
  
  // Validation errors
  COMMENTS_REQUIRED: 'COMMENTS_REQUIRED',
  INVALID_APPROVAL_ACTION: 'INVALID_APPROVAL_ACTION',
  MISSING_PLANNING_ID: 'MISSING_PLANNING_ID',
  
  // Execution blocking errors
  EXECUTION_BLOCKED: 'EXECUTION_BLOCKED',
  PLAN_NOT_APPROVED: 'PLAN_NOT_APPROVED',
  PLANNING_ID_REQUIRED: 'PLANNING_ID_REQUIRED',
  
  // System errors
  APPROVAL_VALIDATION_ERROR: 'APPROVAL_VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUDIT_LOG_FAILED: 'AUDIT_LOG_FAILED'
} as const;

export type ApprovalErrorCode = typeof APPROVAL_ERROR_CODES[keyof typeof APPROVAL_ERROR_CODES];

/**
 * Structured error details for approval operations
 */
export interface ApprovalErrorDetails {
  code: ApprovalErrorCode;
  planningId?: number;
  currentStatus?: string;
  requiredStatus?: string;
  userId?: number;
  userRole?: string;
  action?: string;
  reason?: string;
  context?: Record<string, any>;
}

/**
 * Approval-specific error class with structured error codes and detailed context
 */
export class ApprovalError extends APIError {
  public readonly code: ApprovalErrorCode;
  public readonly planningId?: number;
  public readonly currentStatus?: string;
  public readonly context?: Record<string, any>;

  constructor(
    code: ApprovalErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Partial<ApprovalErrorDetails>
  ) {
    super(message, statusCode, details);
    this.name = 'ApprovalError';
    this.code = code;
    this.planningId = details?.planningId;
    this.currentStatus = details?.currentStatus;
    this.context = details?.context;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApprovalError);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      planningId: this.planningId,
      currentStatus: this.currentStatus,
      context: this.context,
      details: this.details
    };
  }
}

/**
 * Factory functions for creating specific approval errors
 */
export class ApprovalErrorFactory {
  /**
   * Create error for plan not found
   */
  static planNotFound(planningId: number): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.PLAN_NOT_FOUND,
      `Plan with ID ${planningId} not found`,
      404,
      {
        code: APPROVAL_ERROR_CODES.PLAN_NOT_FOUND,
        planningId,
        reason: 'The specified planning ID does not exist in the system'
      }
    );
  }

  /**
   * Create error for invalid status transitions
   */
  static invalidStatusTransition(
    planningId: number,
    currentStatus: string,
    attemptedAction: string
  ): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot ${attemptedAction.toLowerCase()} plan with status: ${currentStatus}. Only PENDING plans can be approved or rejected.`,
      400,
      {
        code: APPROVAL_ERROR_CODES.INVALID_STATUS_TRANSITION,
        planningId,
        currentStatus,
        action: attemptedAction,
        reason: `Plan status must be PENDING to perform ${attemptedAction} action`,
        context: {
          validTransitions: {
            PENDING: ['APPROVE', 'REJECT'],
            APPROVED: [],
            REJECTED: [],
            DRAFT: []
          }
        }
      }
    );
  }

  /**
   * Create error for insufficient permissions
   */
  static insufficientPermissions(
    userId: number,
    userRole: string,
    requiredRoles: string[]
  ): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      `User with role '${userRole}' does not have approval permissions. Required roles: ${requiredRoles.join(', ')}`,
      403,
      {
        code: APPROVAL_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        userId,
        userRole,
        reason: 'User lacks the necessary role permissions to perform approval actions',
        context: {
          requiredRoles,
          currentRole: userRole
        }
      }
    );
  }

  /**
   * Create error for missing required comments
   */
  static commentsRequired(planningId: number, action: string): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.COMMENTS_REQUIRED,
      `Comments are required when ${action.toLowerCase()}ing a plan`,
      400,
      {
        code: APPROVAL_ERROR_CODES.COMMENTS_REQUIRED,
        planningId,
        action,
        reason: 'Rejection actions must include explanatory comments for audit purposes'
      }
    );
  }

  /**
   * Create error for user not found
   */
  static userNotFound(userId: number): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.USER_NOT_FOUND,
      `User with ID ${userId} not found`,
      404,
      {
        code: APPROVAL_ERROR_CODES.USER_NOT_FOUND,
        userId,
        reason: 'The specified user ID does not exist in the system'
      }
    );
  }

  /**
   * Create error for execution blocking
   */
  static executionBlocked(
    planningId: number,
    currentStatus: string,
    reason?: string
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
        reason: reason || `Plan has not been approved for execution. Current status: ${currentStatus}`,
        context: {
          message: 'This plan has not been approved for execution. Only approved plans can proceed to execution phases.',
          requiredStatus: 'APPROVED',
          currentStatus
        }
      }
    );
  }

  /**
   * Create error for missing planning ID
   */
  static planningIdRequired(): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.PLANNING_ID_REQUIRED,
      'Planning ID is required for this operation',
      400,
      {
        code: APPROVAL_ERROR_CODES.PLANNING_ID_REQUIRED,
        reason: 'This execution endpoint requires a valid planning ID to validate approval status'
      }
    );
  }

  /**
   * Create error for invalid approval actions
   */
  static invalidApprovalAction(action: string): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.INVALID_APPROVAL_ACTION,
      `Invalid approval action: ${action}. Valid actions are: APPROVE, REJECT`,
      400,
      {
        code: APPROVAL_ERROR_CODES.INVALID_APPROVAL_ACTION,
        action,
        reason: 'Approval action must be either APPROVE or REJECT',
        context: {
          validActions: ['APPROVE', 'REJECT']
        }
      }
    );
  }

  /**
   * Create error for database operations
   */
  static databaseError(operation: string, originalError?: Error): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.DATABASE_ERROR,
      `Database error during ${operation}`,
      500,
      {
        code: APPROVAL_ERROR_CODES.DATABASE_ERROR,
        reason: `Failed to perform database operation: ${operation}`,
        context: {
          operation,
          originalError: originalError?.message
        }
      }
    );
  }

  /**
   * Create error for audit logging failures
   */
  static auditLogFailed(planningId: number, originalError?: Error): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.AUDIT_LOG_FAILED,
      'Failed to create audit log entry',
      500,
      {
        code: APPROVAL_ERROR_CODES.AUDIT_LOG_FAILED,
        planningId,
        reason: 'Audit trail logging failed during approval operation',
        context: {
          originalError: originalError?.message
        }
      }
    );
  }

  /**
   * Create error for general approval validation failures
   */
  static validationError(message: string, planningId?: number): ApprovalError {
    return new ApprovalError(
      APPROVAL_ERROR_CODES.APPROVAL_VALIDATION_ERROR,
      message,
      500,
      {
        code: APPROVAL_ERROR_CODES.APPROVAL_VALIDATION_ERROR,
        planningId,
        reason: 'Internal server error during approval validation'
      }
    );
  }
}

/**
 * Type guard to check if an error is an ApprovalError
 */
export function isApprovalError(error: any): error is ApprovalError {
  return error instanceof ApprovalError;
}

/**
 * Utility function to extract approval error details from any error
 */
export function getApprovalErrorDetails(error: any): ApprovalErrorDetails | null {
  if (isApprovalError(error)) {
    return {
      code: error.code,
      planningId: error.planningId,
      currentStatus: error.currentStatus,
      context: error.context
    };
  }
  return null;
}