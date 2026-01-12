import { ErrorContext } from "@better-fetch/fetch";

export interface AuthErrorInfo {
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    canRetry: boolean;
    severity: 'error' | 'warning' | 'info';
}

export interface AuthErrorDetails {
    code?: string;
    status?: number;
    message?: string;
    context?: any;
}

/**
 * Maps authentication error codes to user-friendly messages
 */
export const AUTH_ERROR_MAP: Record<string, AuthErrorInfo> = {
    // User-related errors
    'USER_NOT_FOUND': {
        title: "Account not found",
        description: "No account found with this email address. Please check your email or sign up for a new account.",
        action: {
            label: "Sign Up",
            href: "/signup"
        },
        canRetry: false,
        severity: 'error'
    },
    'INVALID_PASSWORD': {
        title: "Incorrect password",
        description: "The password you entered is incorrect. Please try again or reset your password.",
        action: {
            label: "Reset Password",
            href: "/forgot-password"
        },
        canRetry: true,
        severity: 'error'
    },
    'INVALID_CREDENTIALS': {
        title: "Invalid credentials",
        description: "The email or password you entered is incorrect. Please check your credentials and try again.",
        action: {
            label: "Reset Password",
            href: "/forgot-password"
        },
        canRetry: true,
        severity: 'error'
    },
    'EMAIL_NOT_VERIFIED': {
        title: "Email not verified",
        description: "Please verify your email address before signing in. Check your inbox for a verification link.",
        action: {
            label: "Resend Verification",
            href: "/verify-email"
        },
        canRetry: false,
        severity: 'warning'
    },
    'ACCOUNT_LOCKED': {
        title: "Account temporarily locked",
        description: "Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.",
        action: {
            label: "Contact Support",
            href: "/support"
        },
        canRetry: false,
        severity: 'error'
    },
    'USER_BANNED': {
        title: "Account suspended",
        description: "This account has been suspended. Please contact support for assistance.",
        action: {
            label: "Contact Support",
            href: "/support"
        },
        canRetry: false,
        severity: 'error'
    },
    'TOO_MANY_REQUESTS': {
        title: "Too many attempts",
        description: "Too many login attempts. Please wait a few minutes before trying again.",
        canRetry: true,
        severity: 'warning'
    },
    'WEAK_PASSWORD': {
        title: "Password update required",
        description: "Your password needs to be updated to meet current security requirements. Please reset your password.",
        action: {
            label: "Reset Password",
            href: "/forgot-password"
        },
        canRetry: false,
        severity: 'warning'
    },
    'EMAIL_EXISTS': {
        title: "Email already registered",
        description: "An account with this email already exists. Please sign in or use a different email.",
        action: {
            label: "Sign In",
            href: "/sign-in"
        },
        canRetry: false,
        severity: 'error'
    },
    'SIGNUP_DISABLED': {
        title: "Registration unavailable",
        description: "New account registration is currently disabled. Please contact support if you need access.",
        action: {
            label: "Contact Support",
            href: "/support"
        },
        canRetry: false,
        severity: 'error'
    },
    'PROVIDER_DISABLED': {
        title: "Sign-in method unavailable",
        description: "This sign-in method is currently unavailable. Please try a different method or contact support.",
        canRetry: false,
        severity: 'error'
    },
    'SESSION_EXPIRED': {
        title: "Session expired",
        description: "Your session has expired. Please sign in again to continue.",
        canRetry: true,
        severity: 'info'
    },
    'INVALID_TOKEN': {
        title: "Invalid verification",
        description: "The verification link is invalid or has expired. Please request a new one.",
        action: {
            label: "Resend Link",
            href: "/verify-email"
        },
        canRetry: false,
        severity: 'error'
    }
};

/**
 * Maps HTTP status codes to user-friendly messages
 */
export const HTTP_ERROR_MAP: Record<number, AuthErrorInfo> = {
    400: {
        title: "Invalid request",
        description: "The request was invalid. Please check your input and try again.",
        canRetry: true,
        severity: 'error'
    },
    401: {
        title: "Authentication failed",
        description: "Invalid email or password. Please check your credentials and try again.",
        action: {
            label: "Reset Password",
            href: "/forgot-password"
        },
        canRetry: true,
        severity: 'error'
    },
    403: {
        title: "Access denied",
        description: "You don't have permission to access this resource. Please contact support if you believe this is an error.",
        action: {
            label: "Contact Support",
            href: "/support"
        },
        canRetry: false,
        severity: 'error'
    },
    404: {
        title: "Resource not found",
        description: "The requested resource was not found. Please check the URL and try again.",
        canRetry: false,
        severity: 'error'
    },
    429: {
        title: "Too many requests",
        description: "Too many requests. Please wait a few minutes before trying again.",
        canRetry: true,
        severity: 'warning'
    },
    500: {
        title: "Server error",
        description: "We're experiencing technical difficulties. Please try again in a few minutes.",
        canRetry: true,
        severity: 'error'
    },
    502: {
        title: "Service unavailable",
        description: "The service is temporarily unavailable. Please try again later.",
        canRetry: true,
        severity: 'error'
    },
    503: {
        title: "Service unavailable",
        description: "The service is temporarily unavailable. Please try again later.",
        canRetry: true,
        severity: 'error'
    }
};

/**
 * Default error for unknown cases
 */
export const DEFAULT_AUTH_ERROR: AuthErrorInfo = {
    title: "Authentication error",
    description: "An unexpected error occurred. Please try again or contact support if the problem persists.",
    action: {
        label: "Try Again"
    },
    canRetry: true,
    severity: 'error'
};

/**
 * Extracts error details from Better Auth ErrorContext
 */
export function extractErrorDetails(ctx: ErrorContext): AuthErrorDetails {
    const errorResponse = ctx?.response as any;
    const errorCode = errorResponse?.code || (ctx as any)?.error?.code;
    const status = ctx?.response?.status || (ctx as any)?.error?.status;
    const message = errorResponse?.message || errorResponse?.error || (ctx as any)?.error?.message;

    return {
        code: errorCode,
        status: status,
        message: message,
        context: ctx
    };
}

/**
 * Maps authentication errors to user-friendly information
 */
export function mapAuthError(errorDetails: AuthErrorDetails): AuthErrorInfo {
    const { code, status, message } = errorDetails;

    // First, try to match by specific error code
    if (code && AUTH_ERROR_MAP[code]) {
        return AUTH_ERROR_MAP[code];
    }

    // Then try to match by HTTP status code
    if (status && HTTP_ERROR_MAP[status]) {
        return HTTP_ERROR_MAP[status];
    }

    // Handle network-related errors
    if (message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
            return {
                title: "Connection problem",
                description: "Please check your internet connection and try again.",
                canRetry: true,
                severity: 'error'
            };
        }
        
        if (lowerMessage.includes('timeout')) {
            return {
                title: "Request timeout",
                description: "The request took too long. Please try again.",
                canRetry: true,
                severity: 'error'
            };
        }
        
        if (lowerMessage.includes('cors')) {
            return {
                title: "Configuration error",
                description: "There's a configuration issue. Please contact support.",
                action: {
                    label: "Contact Support",
                    href: "/support"
                },
                canRetry: false,
                severity: 'error'
            };
        }
    }

    // Return default error if no specific mapping found
    return DEFAULT_AUTH_ERROR;
}

/**
 * Main function to handle authentication errors
 */
export function handleAuthError(ctx: ErrorContext): AuthErrorInfo {
    const errorDetails = extractErrorDetails(ctx);
    
    // Log detailed error for debugging in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Authentication error details:', {
            ...errorDetails,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
        });
    }

    return mapAuthError(errorDetails);
}

/**
 * Utility to check if an error is retryable
 */
export function isRetryableError(error: AuthErrorInfo): boolean {
    return error.canRetry && error.severity !== 'error';
}

/**
 * Utility to format error for logging
 */
export function formatErrorForLogging(errorDetails: AuthErrorDetails): string {
    const { code, status, message } = errorDetails;
    const parts = [];
    
    if (code) parts.push(`Code: ${code}`);
    if (status) parts.push(`Status: ${status}`);
    if (message) parts.push(`Message: ${message}`);
    
    return parts.join(' | ') || 'Unknown error';
} 