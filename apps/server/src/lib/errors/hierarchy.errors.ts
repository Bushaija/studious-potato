import { APIError } from '@/lib/types';

/**
 * Hierarchy-specific error codes for structured error handling
 */
export const HIERARCHY_ERROR_CODES = {
  // Validation errors
  ROLE_FACILITY_MISMATCH: 'ROLE_FACILITY_MISMATCH',
  FACILITY_NOT_FOUND: 'FACILITY_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_FACILITY_TYPE: 'INVALID_FACILITY_TYPE',
  FACILITY_REQUIRED: 'FACILITY_REQUIRED',
  
  // Authorization errors
  ACCESS_DENIED: 'ACCESS_DENIED',
  CROSS_DISTRICT_ACCESS: 'CROSS_DISTRICT_ACCESS',
  HIERARCHY_ACCESS_DENIED: 'HIERARCHY_ACCESS_DENIED',
  INACTIVE_USER: 'INACTIVE_USER',
  NO_FACILITY_ASSIGNMENT: 'NO_FACILITY_ASSIGNMENT',
  
  // Approval errors
  INVALID_APPROVER: 'INVALID_APPROVER',
  APPROVAL_HIERARCHY_VIOLATION: 'APPROVAL_HIERARCHY_VIOLATION',
  
  // System errors
  HIERARCHY_VALIDATION_ERROR: 'HIERARCHY_VALIDATION_ERROR',
} as const;

export type HierarchyErrorCode = typeof HIERARCHY_ERROR_CODES[keyof typeof HIERARCHY_ERROR_CODES];

/**
 * Structured error details for hierarchy operations
 */
export interface HierarchyErrorDetails {
  code: HierarchyErrorCode;
  userId?: number;
  userName?: string;
  userRole?: string;
  userFacilityId?: number | null;
  userFacilityName?: string;
  userDistrictId?: number;
  targetFacilityId?: number;
  targetFacilityName?: string;
  targetDistrictId?: number;
  facilityId?: number | null;
  facilityName?: string;
  facilityType?: string;
  role?: string;
  reason?: string;
  context?: Record<string, any>;
}

/**
 * Base hierarchy error class with structured error codes and detailed context
 */
export class HierarchyError extends APIError {
  public readonly code: HierarchyErrorCode;
  public readonly userId?: number;
  public readonly userFacilityId?: number | null;
  public readonly targetFacilityId?: number;
  public readonly context?: Record<string, any>;

  constructor(
    code: HierarchyErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Partial<HierarchyErrorDetails>
  ) {
    super(message, statusCode, details);
    this.name = 'HierarchyError';
    this.code = code;
    this.userId = details?.userId;
    this.userFacilityId = details?.userFacilityId;
    this.targetFacilityId = details?.targetFacilityId;
    this.context = details?.context;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HierarchyError);
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
      userId: this.userId,
      userFacilityId: this.userFacilityId,
      targetFacilityId: this.targetFacilityId,
      context: this.context,
      details: this.details,
    };
  }
}

/**
 * Validation error for hierarchy-related validation failures
 * Used for input validation and data consistency checks
 */
export class HierarchyValidationError extends HierarchyError {
  constructor(
    message: string,
    details?: Partial<HierarchyErrorDetails>
  ) {
    const code = details?.code || HIERARCHY_ERROR_CODES.HIERARCHY_VALIDATION_ERROR;
    super(code, message, 400, details);
    this.name = 'HierarchyValidationError';
  }
}

/**
 * Authorization error for hierarchy-based access control failures
 * Used when users attempt to access resources outside their hierarchy
 */
export class HierarchyAuthorizationError extends HierarchyError {
  constructor(
    message: string,
    details?: Partial<HierarchyErrorDetails>
  ) {
    const code = details?.code || HIERARCHY_ERROR_CODES.ACCESS_DENIED;
    super(code, message, 403, details);
    this.name = 'HierarchyAuthorizationError';
  }
}

/**
 * Factory functions for creating specific hierarchy errors
 */
export class HierarchyErrorFactory {
  /**
   * Create error for role-facility consistency validation
   */
  static roleFacilityMismatch(
    role: string,
    facilityId: number | null,
    facilityType?: string
  ): HierarchyValidationError {
    return new HierarchyValidationError(
      `${role.toUpperCase()} role can only be assigned to hospital facilities`,
      {
        code: HIERARCHY_ERROR_CODES.ROLE_FACILITY_MISMATCH,
        role,
        facilityId,
        facilityType,
        reason: 'DAF and DG roles are restricted to hospital-type facilities',
      }
    );
  }

  /**
   * Create error for missing facility assignment
   */
  static facilityRequired(role: string): HierarchyValidationError {
    return new HierarchyValidationError(
      `${role.toUpperCase()} role requires a facility assignment`,
      {
        code: HIERARCHY_ERROR_CODES.FACILITY_REQUIRED,
        role,
        reason: 'DAF and DG roles must be assigned to a specific facility',
      }
    );
  }

  /**
   * Create error for facility not found
   */
  static facilityNotFound(facilityId: number): HierarchyValidationError {
    return new HierarchyValidationError(
      `Facility with ID ${facilityId} not found`,
      {
        code: HIERARCHY_ERROR_CODES.FACILITY_NOT_FOUND,
        facilityId,
        reason: 'The specified facility does not exist',
      }
    );
  }

  /**
   * Create error for user not found
   */
  static userNotFound(userId: number): HierarchyValidationError {
    return new HierarchyValidationError(
      `User with ID ${userId} not found`,
      {
        code: HIERARCHY_ERROR_CODES.USER_NOT_FOUND,
        userId,
        reason: 'The specified user does not exist',
      }
    );
  }

  /**
   * Create error for cross-district access attempts
   */
  static crossDistrictAccess(
    userFacilityId: number,
    targetFacilityId: number,
    userDistrictId: number,
    targetDistrictId: number,
    userFacilityName?: string,
    targetFacilityName?: string
  ): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      `Cross-district operation not allowed. Facilities are in different districts`,
      {
        code: HIERARCHY_ERROR_CODES.CROSS_DISTRICT_ACCESS,
        userFacilityId,
        targetFacilityId,
        userDistrictId,
        targetDistrictId,
        userFacilityName,
        targetFacilityName,
        reason: 'Operations are restricted to facilities within the same district',
      }
    );
  }

  /**
   * Create error for hierarchy access denial
   */
  static hierarchyAccessDenied(
    userId: number,
    targetFacilityId: number,
    userRole?: string,
    userFacilityId?: number | null,
    targetFacilityName?: string
  ): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      `Access denied: Facility is outside your district hierarchy`,
      {
        code: HIERARCHY_ERROR_CODES.HIERARCHY_ACCESS_DENIED,
        userId,
        userRole,
        userFacilityId,
        targetFacilityId,
        targetFacilityName,
        reason: 'User does not have access to this facility based on hierarchy rules',
      }
    );
  }

  /**
   * Create error for inactive user
   */
  static inactiveUser(userId: number, userName?: string): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      'User account is inactive',
      {
        code: HIERARCHY_ERROR_CODES.INACTIVE_USER,
        userId,
        userName,
        reason: 'Inactive users cannot access facilities',
      }
    );
  }

  /**
   * Create error for missing facility assignment
   */
  static noFacilityAssignment(userId: number, userName?: string, userRole?: string): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      'User has no facility assignment',
      {
        code: HIERARCHY_ERROR_CODES.NO_FACILITY_ASSIGNMENT,
        userId,
        userName,
        userRole,
        reason: 'Users without facility assignments cannot access facilities',
      }
    );
  }

  /**
   * Create error for invalid approver
   */
  static invalidApprover(
    userId: number,
    targetFacilityId: number,
    userRole?: string,
    reason?: string
  ): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      'User is not authorized to approve reports for this facility',
      {
        code: HIERARCHY_ERROR_CODES.INVALID_APPROVER,
        userId,
        userRole,
        targetFacilityId,
        reason: reason || 'Approver must be assigned to the correct facility in the hierarchy',
      }
    );
  }

  /**
   * Create error for approval hierarchy violations
   */
  static approvalHierarchyViolation(
    message: string,
    userId: number,
    targetFacilityId: number,
    details?: Partial<HierarchyErrorDetails>
  ): HierarchyAuthorizationError {
    return new HierarchyAuthorizationError(
      message,
      {
        code: HIERARCHY_ERROR_CODES.APPROVAL_HIERARCHY_VIOLATION,
        userId,
        targetFacilityId,
        ...details,
      }
    );
  }
}

/**
 * Type guard to check if an error is a HierarchyError
 */
export function isHierarchyError(error: any): error is HierarchyError {
  return error instanceof HierarchyError;
}

/**
 * Type guard to check if an error is a HierarchyValidationError
 */
export function isHierarchyValidationError(error: any): error is HierarchyValidationError {
  return error instanceof HierarchyValidationError;
}

/**
 * Type guard to check if an error is a HierarchyAuthorizationError
 */
export function isHierarchyAuthorizationError(error: any): error is HierarchyAuthorizationError {
  return error instanceof HierarchyAuthorizationError;
}

/**
 * Utility function to extract hierarchy error details from any error
 */
export function getHierarchyErrorDetails(error: any): HierarchyErrorDetails | null {
  if (isHierarchyError(error)) {
    return {
      code: error.code,
      userId: error.userId,
      userFacilityId: error.userFacilityId,
      targetFacilityId: error.targetFacilityId,
      context: error.context,
      ...(error.details as Partial<HierarchyErrorDetails>),
    };
  }
  return null;
}
