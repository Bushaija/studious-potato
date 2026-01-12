import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ErrorContext } from "@better-fetch/fetch";
import { handleAuthError, formatErrorForLogging, extractErrorDetails, AuthErrorInfo } from '@/lib/auth-errors';

export interface UseAuthErrorOptions {
    /**
     * Whether to automatically show toast notifications for errors
     * @default true
     */
    showToast?: boolean;
    /**
     * Whether to log errors to console in development
     * @default true
     */
    logErrors?: boolean;
    /**
     * Custom error handler callback
     */
    onError?: (errorInfo: AuthErrorInfo, originalContext: ErrorContext) => void;
    /**
     * Custom success handler callback
     */
    onSuccess?: (data?: any) => void;
}

export interface AuthErrorHandler {
    /**
     * Handle authentication error with user-friendly messaging
     */
    handleError: (ctx: ErrorContext) => void;
    /**
     * Handle success case
     */
    handleSuccess: (data?: any) => void;
    /**
     * Get error info without displaying toast
     */
    getErrorInfo: (ctx: ErrorContext) => AuthErrorInfo;
}

/**
 * Custom hook for handling authentication errors consistently across the app
 */
export function useAuthError(options: UseAuthErrorOptions = {}): AuthErrorHandler {
    const router = useRouter();
    const {
        showToast = true,
        logErrors = true,
        onError,
        onSuccess,
    } = options;

    const getErrorInfo = (ctx: ErrorContext): AuthErrorInfo => {
        const errorInfo = handleAuthError(ctx);
        
        if (logErrors && process.env.NODE_ENV === 'development') {
            const errorDetails = extractErrorDetails(ctx);
            console.error('Authentication error:', formatErrorForLogging(errorDetails));
        }

        return errorInfo;
    };

    const handleError = (ctx: ErrorContext) => {
        const errorInfo = getErrorInfo(ctx);

        // Call custom error handler if provided
        if (onError) {
            onError(errorInfo, ctx);
        }

        // Show toast notification if enabled
        if (showToast) {
            toast.error(errorInfo.title, {
                description: errorInfo.description,
                action: errorInfo.action ? {
                    label: errorInfo.action.label,
                    onClick: () => {
                        if (errorInfo.action?.href) {
                            router.push(errorInfo.action.href);
                        } else if (errorInfo.action?.onClick) {
                            errorInfo.action.onClick();
                        } else {
                            toast.dismiss();
                        }
                    }
                } : undefined,
                duration: errorInfo.severity === 'error' ? 6000 : 4000,
            });
        }
    };

    const handleSuccess = (data?: any) => {
        if (onSuccess) {
            onSuccess(data);
        }
    };

    return {
        handleError,
        handleSuccess,
        getErrorInfo,
    };
}

/**
 * Specialized hook for sign-in error handling
 */
export function useSignInError() {
    const router = useRouter();
    
    return useAuthError({
        onSuccess: (data?: any) => {
            // Check if user must change password
            const mustChangePassword = data?.user?.mustChangePassword;
            
            toast('Login successful!', {
                description: mustChangePassword 
                    ? 'Please change your password to continue.' 
                    : 'Welcome back!',
            });
            
            // Delay navigation to show success message
            // Let middleware handle redirect based on mustChangePassword flag
            setTimeout(() => {
                if (mustChangePassword) {
                    // Middleware will redirect to /change-password
                    router.push('/dashboard');
                } else {
                    router.push('/dashboard');
                }
                router.refresh();
            }, 1000);
        },
    });
}

/**
 * Specialized hook for sign-up error handling
 */
export function useSignUpError() {
    const router = useRouter();
    
    return useAuthError({
        onSuccess: () => {
            toast.success('Account created!', {
                description: 'Please check your email to verify your account.',
            });
            
            // Redirect to verification page or sign-in
            setTimeout(() => {
                router.push('/verify-email');
            }, 1500);
        },
    });
}

/**
 * Specialized hook for password reset error handling
 */
export function usePasswordResetError() {
    return useAuthError({
        onSuccess: () => {
            toast.success('Reset link sent!', {
                description: 'Please check your email for password reset instructions.',
            });
        },
    });
}

/**
 * Hook for handling general authentication state errors
 */
export function useAuthStateError() {
    const router = useRouter();
    
    return useAuthError({
        showToast: false, // Handle display manually for state errors
        onError: (errorInfo, ctx) => {
            // Handle different types of auth state errors
            const errorDetails = extractErrorDetails(ctx);
            
            if (errorDetails.code === 'SESSION_EXPIRED') {
                toast.info('Session expired', {
                    description: 'Please sign in again to continue.',
                    action: {
                        label: 'Sign In',
                        onClick: () => router.push('/sign-in'),
                    },
                });
            } else if (errorDetails.status === 401) {
                // Unauthorized - redirect to sign in
                router.push('/sign-in');
            } else {
                // Show generic error
                toast.error(errorInfo.title, {
                    description: errorInfo.description,
                });
            }
        },
    });
} 