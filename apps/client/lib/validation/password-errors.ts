/**
 * Error handling utilities for password management operations
 * Provides comprehensive error mapping, validation, and user-friendly messaging
 */

export interface PasswordErrorInfo {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
  category: 'validation' | 'network' | 'server' | 'access' | 'token';
}

export interface PasswordErrorDetails {
  code?: string;
  status?: number;
  message?: string;
  operation?: 'change' | 'reset' | 'forgot' | 'verify';
  context?: any;
}

/**
 * Maps password validation error codes to user-friendly messages
 */
export const PASSWORD_VALIDATION_ERROR_MAP: Record<string, PasswordErrorInfo> = {
  'PASSWORD_TOO_SHORT': {
    title: "Password too short",
    description: "Password must be at least 8 characters long. Please choose a longer password.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_NO_UPPERCASE': {
    title: "Missing uppercase letter",
    description: "Password must contain at least one uppercase letter (A-Z).",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_NO_LOWERCASE': {
    title: "Missing lowercase letter",
    description: "Password must contain at least one lowercase letter (a-z).",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_NO_NUMBER': {
    title: "Missing number",
    description: "Password must contain at least one number (0-9).",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_NO_SPECIAL': {
    title: "Missing special character",
    description: "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?).",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_TOO_COMMON': {
    title: "Password too common",
    description: "This password is too common and easily guessable. Please choose a more unique password.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORDS_DO_NOT_MATCH': {
    title: "Passwords don't match",
    description: "The passwords you entered don't match. Please ensure both password fields are identical.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'PASSWORD_SAME_AS_CURRENT': {
    title: "Password unchanged",
    description: "Your new password must be different from your current password.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  }
};

/**
 * Maps password operation error codes to user-friendly messages
 */
export const PASSWORD_OPERATION_ERROR_MAP: Record<string, PasswordErrorInfo> = {
  'INVALID_CURRENT_PASSWORD': {
    title: "Incorrect current password",
    description: "The current password you entered is incorrect. Please try again or reset your password if you've forgotten it.",
    action: {
      label: "Reset Password",
      href: "/forgot-password"
    },
    canRetry: true,
    severity: 'error',
    category: 'access'
  },
  'PASSWORD_CHANGE_FAILED': {
    title: "Password change failed",
    description: "Unable to change your password. Please try again or contact support if the problem persists.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  'PASSWORD_RESET_FAILED': {
    title: "Password reset failed",
    description: "Unable to reset your password. Please try again or contact support if the problem persists.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  'EMAIL_NOT_FOUND': {
    title: "Email not found",
    description: "No account found with this email address. Please check your email or contact support.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'EMAIL_SEND_FAILED': {
    title: "Email delivery failed",
    description: "Unable to send the password reset email. Please try again in a few minutes.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  'INVALID_TOKEN': {
    title: "Invalid reset link",
    description: "This password reset link is invalid. Please request a new password reset link.",
    action: {
      label: "Request New Link",
      href: "/forgot-password"
    },
    canRetry: false,
    severity: 'error',
    category: 'token'
  },
  'TOKEN_EXPIRED': {
    title: "Reset link expired",
    description: "This password reset link has expired. Password reset links are valid for 10 minutes. Please request a new one.",
    action: {
      label: "Request New Link",
      href: "/forgot-password"
    },
    canRetry: false,
    severity: 'error',
    category: 'token'
  },
  'TOKEN_ALREADY_USED': {
    title: "Reset link already used",
    description: "This password reset link has already been used. If you need to reset your password again, please request a new link.",
    action: {
      label: "Request New Link",
      href: "/forgot-password"
    },
    canRetry: false,
    severity: 'error',
    category: 'token'
  },
  'VERIFICATION_TOKEN_INVALID': {
    title: "Invalid verification link",
    description: "This email verification link is invalid. Please contact support for assistance.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'token'
  },
  'VERIFICATION_TOKEN_EXPIRED': {
    title: "Verification link expired",
    description: "This email verification link has expired. Please contact support to request a new verification email.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'token'
  },
  'EMAIL_ALREADY_VERIFIED': {
    title: "Email already verified",
    description: "This email address has already been verified. You can sign in to your account.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'info',
    category: 'validation'
  }
};

/**
 * Maps network and server error codes to user-friendly messages
 */
export const PASSWORD_NETWORK_ERROR_MAP: Record<string, PasswordErrorInfo> = {
  'NETWORK_ERROR': {
    title: "Connection problem",
    description: "Unable to connect to the server. Please check your internet connection and try again.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  },
  'TIMEOUT_ERROR': {
    title: "Request timeout",
    description: "The request took too long and timed out. Please try again.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  },
  'SERVER_ERROR': {
    title: "Server error",
    description: "We're experiencing technical difficulties. Please try again in a few minutes or contact support if the problem persists.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  'SERVICE_UNAVAILABLE': {
    title: "Service temporarily unavailable",
    description: "The password service is temporarily unavailable. Please try again in a few minutes.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  }
};

/**
 * Maps access control error codes to user-friendly messages
 */
export const PASSWORD_ACCESS_ERROR_MAP: Record<string, PasswordErrorInfo> = {
  'UNAUTHORIZED': {
    title: "Authentication required",
    description: "Your session has expired. Please sign in again to continue.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  'SESSION_EXPIRED': {
    title: "Session expired",
    description: "Your session has expired. Please sign in again to change your password.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  'ACCESS_DENIED': {
    title: "Access denied",
    description: "You don't have permission to perform this action. Please contact support if you believe this is an error.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  }
};

/**
 * Maps HTTP status codes to user-friendly messages for password operations
 */
export const HTTP_PASSWORD_ERROR_MAP: Record<number, PasswordErrorInfo> = {
  400: {
    title: "Invalid request",
    description: "The request is invalid. Please check your input and try again.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  401: {
    title: "Authentication required",
    description: "Your session has expired. Please sign in again to continue.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  403: {
    title: "Access denied",
    description: "You don't have permission to perform this action. Please contact support if you believe this is an error.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  404: {
    title: "Resource not found",
    description: "The requested resource was not found. Please check the URL and try again.",
    canRetry: false,
    severity: 'error',
    category: 'validation'
  },
  422: {
    title: "Validation failed",
    description: "The password doesn't meet the required criteria. Please review the requirements and try again.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  429: {
    title: "Too many attempts",
    description: "Too many password change attempts. Please wait a few minutes before trying again.",
    canRetry: true,
    severity: 'warning',
    category: 'network'
  },
  500: {
    title: "Server error",
    description: "We're experiencing technical difficulties. Please try again in a few minutes.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  502: {
    title: "Service unavailable",
    description: "The service is temporarily unavailable. Please try again later.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  503: {
    title: "Service unavailable",
    description: "The service is temporarily unavailable. Please try again later.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  504: {
    title: "Request timeout",
    description: "The request took too long to process. Please try again.",
    action: {
      label: "Try Again"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  }
};

/**
 * Default error for unknown cases
 */
export const DEFAULT_PASSWORD_ERROR: PasswordErrorInfo = {
  title: "Password operation failed",
  description: "An unexpected error occurred. Please try again or contact support if the problem persists.",
  action: {
    label: "Try Again"
  },
  canRetry: true,
  severity: 'error',
  category: 'server'
};

/**
 * Extracts error details from various error sources
 */
export function extractPasswordErrorDetails(error: any): PasswordErrorDetails {
  // Handle Better Auth ErrorContext
  if (error?.response) {
    const errorResponse = error.response as any;
    return {
      status: errorResponse.status,
      code: errorResponse.code || errorResponse.error?.code,
      message: errorResponse.message || errorResponse.error?.message || error.message,
      operation: error.operation,
      context: errorResponse
    };
  }

  // Handle fetch API error
  if (error?.status) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      operation: error.operation,
      context: error
    };
  }

  // Generic error object
  return {
    code: error?.code,
    message: error?.message || String(error),
    operation: error?.operation,
    context: error
  };
}

/**
 * Maps password errors to user-friendly information
 */
export function mapPasswordError(errorDetails: PasswordErrorDetails): PasswordErrorInfo {
  const { code, status, message } = errorDetails;

  // First, try to match by specific error code
  if (code) {
    // Check validation errors
    if (PASSWORD_VALIDATION_ERROR_MAP[code]) {
      return PASSWORD_VALIDATION_ERROR_MAP[code];
    }
    
    // Check operation errors
    if (PASSWORD_OPERATION_ERROR_MAP[code]) {
      return PASSWORD_OPERATION_ERROR_MAP[code];
    }
    
    // Check network errors
    if (PASSWORD_NETWORK_ERROR_MAP[code]) {
      return PASSWORD_NETWORK_ERROR_MAP[code];
    }
    
    // Check access errors
    if (PASSWORD_ACCESS_ERROR_MAP[code]) {
      return PASSWORD_ACCESS_ERROR_MAP[code];
    }
  }

  // Then try to match by HTTP status code
  if (status && HTTP_PASSWORD_ERROR_MAP[status]) {
    return HTTP_PASSWORD_ERROR_MAP[status];
  }

  // Handle network-related errors by message content
  if (message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
      return PASSWORD_NETWORK_ERROR_MAP.NETWORK_ERROR;
    }
    
    if (lowerMessage.includes('timeout')) {
      return PASSWORD_NETWORK_ERROR_MAP.TIMEOUT_ERROR;
    }
    
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
      return PASSWORD_ACCESS_ERROR_MAP.UNAUTHORIZED;
    }

    if (lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
      return PASSWORD_ACCESS_ERROR_MAP.ACCESS_DENIED;
    }

    if (lowerMessage.includes('token') && lowerMessage.includes('expired')) {
      return PASSWORD_OPERATION_ERROR_MAP.TOKEN_EXPIRED;
    }

    if (lowerMessage.includes('token') && lowerMessage.includes('invalid')) {
      return PASSWORD_OPERATION_ERROR_MAP.INVALID_TOKEN;
    }
  }

  // Return default error if no specific mapping found
  return DEFAULT_PASSWORD_ERROR;
}

/**
 * Main function to handle password errors
 */
export function handlePasswordError(error: any): PasswordErrorInfo {
  const errorDetails = extractPasswordErrorDetails(error);
  
  // Log detailed error for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Password operation error details:', {
      ...errorDetails,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
    });
  }

  return mapPasswordError(errorDetails);
}

/**
 * Utility to check if an error is retryable
 */
export function isRetryablePasswordError(error: PasswordErrorInfo): boolean {
  return error.canRetry && !['access', 'token'].includes(error.category);
}

/**
 * Utility to format error for logging
 */
export function formatPasswordErrorForLogging(errorDetails: PasswordErrorDetails): string {
  const { code, status, message, operation } = errorDetails;
  const parts = [];
  
  if (operation) parts.push(`Operation: ${operation}`);
  if (code) parts.push(`Code: ${code}`);
  if (status) parts.push(`Status: ${status}`);
  if (message) parts.push(`Message: ${message}`);
  
  return parts.join(' | ') || 'Unknown password error';
}

/**
 * Get operation-specific error context
 */
export function getOperationErrorContext(operation: PasswordErrorDetails['operation']): string {
  switch (operation) {
    case 'change':
      return 'changing your password';
    case 'reset':
      return 'resetting your password';
    case 'forgot':
      return 'requesting password reset';
    case 'verify':
      return 'verifying your email';
    default:
      return 'processing your request';
  }
}
