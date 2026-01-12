/**
 * Custom hook for handling upload errors consistently across upload components
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { 
  handleUploadError, 
  isRetryableUploadError, 
  getRetryDelay,
  shouldRetryUpload,
  getRetryMessage,
  formatUploadErrorForLogging,
  extractUploadErrorDetails,
  type UploadErrorInfo 
} from '@/lib/upload-errors';

export interface UseUploadErrorOptions {
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
  onError?: (errorInfo: UploadErrorInfo, originalError: any) => void;
  /**
   * Custom retry handler callback
   */
  onRetry?: (errorInfo: UploadErrorInfo) => void;
  /**
   * Maximum number of automatic retries for retryable errors
   * @default 0 (no automatic retries)
   */
  maxAutoRetries?: number;
  /**
   * Whether to enable automatic retries for network errors
   * @default false
   */
  enableAutoRetry?: boolean;
}

export interface UploadErrorHandler {
  /**
   * Handle upload error with user-friendly messaging
   */
  handleError: (error: any) => UploadErrorInfo;
  /**
   * Get error info without displaying toast
   */
  getErrorInfo: (error: any) => UploadErrorInfo;
  /**
   * Check if an error is retryable
   */
  isRetryable: (error: UploadErrorInfo) => boolean;
  /**
   * Get suggested retry delay for an error
   */
  getRetryDelay: (error: UploadErrorInfo, attemptCount: number) => number;
}

/**
 * Custom hook for handling upload errors consistently across the app
 */
export function useUploadError(options: UseUploadErrorOptions = {}): UploadErrorHandler {
  const {
    showToast = true,
    logErrors = true,
    onError,
    onRetry,
    maxAutoRetries = 0,
    enableAutoRetry = false,
  } = options;

  const getErrorInfo = useCallback((error: any): UploadErrorInfo => {
    const errorInfo = handleUploadError(error);
    
    if (logErrors && process.env.NODE_ENV === 'development') {
      const errorDetails = extractUploadErrorDetails(error);
      console.error('Upload error:', formatUploadErrorForLogging(errorDetails));
    }

    return errorInfo;
  }, [logErrors]);

  const handleErrorWithToast = useCallback((error: any): UploadErrorInfo => {
    const errorInfo = getErrorInfo(error);

    // Call custom error handler if provided
    if (onError) {
      onError(errorInfo, error);
    }

    // Show toast notification if enabled
    if (showToast) {
      const toastAction = errorInfo.action ? {
        label: errorInfo.action.label,
        onClick: () => {
          if (errorInfo.action?.onClick) {
            errorInfo.action.onClick();
          } else if (errorInfo.action?.href) {
            window.location.href = errorInfo.action.href;
          } else if (errorInfo.canRetry && onRetry) {
            onRetry(errorInfo);
          }
        }
      } : undefined;

      // Use different toast types based on severity
      switch (errorInfo.severity) {
        case 'error':
          toast.error(errorInfo.title, {
            description: errorInfo.description,
            action: toastAction,
            duration: 8000, // Longer duration for errors
          });
          break;
        case 'warning':
          toast.warning(errorInfo.title, {
            description: errorInfo.description,
            action: toastAction,
            duration: 6000,
          });
          break;
        case 'info':
          toast.info(errorInfo.title, {
            description: errorInfo.description,
            action: toastAction,
            duration: 4000,
          });
          break;
      }
    }

    return errorInfo;
  }, [getErrorInfo, onError, showToast, onRetry]);

  const isRetryable = useCallback((error: UploadErrorInfo): boolean => {
    return isRetryableUploadError(error);
  }, []);

  const getRetryDelayForError = useCallback((error: UploadErrorInfo, attemptCount: number): number => {
    return getRetryDelay(error, attemptCount);
  }, []);

  return {
    handleError: handleErrorWithToast,
    getErrorInfo,
    isRetryable,
    getRetryDelay: getRetryDelayForError,
  };
}

/**
 * Specialized hook for file validation errors
 */
export function useFileValidationError() {
  return useUploadError({
    showToast: true,
    logErrors: true,
    onError: (errorInfo) => {
      // File validation errors are usually user-correctable
      // We can provide more specific guidance
      if (errorInfo.category === 'validation') {
        console.info('File validation guidance:', {
          error: errorInfo.title,
          suggestion: errorInfo.action?.label || 'Please correct the file and try again'
        });
      }
    }
  });
}

/**
 * Specialized hook for network upload errors with enhanced retry logic
 */
export function useNetworkUploadError(onRetry?: () => void) {
  return useUploadError({
    showToast: true,
    logErrors: true,
    enableAutoRetry: false, // Manual retry only for better UX control
    onRetry: onRetry ? () => onRetry() : undefined,
    onError: (errorInfo, originalError) => {
      // Enhanced logging for network errors
      if (errorInfo.category === 'network') {
        console.warn('Network upload error:', {
          error: errorInfo.title,
          description: errorInfo.description,
          canRetry: errorInfo.canRetry,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          onlineStatus: navigator.onLine
        });
      }

      // Log server errors for debugging
      if (errorInfo.category === 'server') {
        console.error('Server upload error:', {
          error: errorInfo.title,
          originalError: originalError,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

/**
 * Hook for handling upload errors with automatic retry capability
 */
export function useUploadErrorWithRetry(
  onRetry: () => void,
  maxRetries: number = 3
) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const errorHandler = useUploadError({
    showToast: true,
    logErrors: true,
    onError: (errorInfo, originalError) => {
      // Log retry attempts
      console.info('Upload error with retry capability:', {
        error: errorInfo.title,
        retryCount,
        maxRetries,
        canRetry: errorInfo.canRetry,
        shouldAutoRetry: shouldRetryUpload(errorInfo, retryCount, maxRetries)
      });
    }
  });

  const handleRetry = useCallback(async (errorInfo: UploadErrorInfo) => {
    if (retryCount >= maxRetries || !errorInfo.canRetry) {
      return false;
    }

    setIsRetrying(true);
    const delay = getRetryDelay(errorInfo, retryCount);
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    setRetryCount(prev => prev + 1);
    setIsRetrying(false);
    onRetry();
    return true;
  }, [retryCount, maxRetries, onRetry]);

  const resetRetry = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    ...errorHandler,
    retryCount,
    isRetrying,
    canRetry: (errorInfo: UploadErrorInfo) => 
      retryCount < maxRetries && errorInfo.canRetry && shouldRetryUpload(errorInfo, retryCount, maxRetries),
    handleRetry,
    resetRetry,
    getRetryMessage: (errorInfo: UploadErrorInfo) => getRetryMessage(errorInfo, retryCount)
  };
}

/**
 * Specialized hook for access control errors
 */
export function useAccessUploadError() {
  return useUploadError({
    showToast: true,
    logErrors: false, // Don't log access errors (they're expected)
    onError: (errorInfo) => {
      // Access errors usually require user action or admin intervention
      if (errorInfo.category === 'access') {
        console.info('Access control info:', {
          error: errorInfo.title,
          action: errorInfo.action?.label || 'Contact administrator'
        });
      }
    }
  });
}

/**
 * Hook for handling validation result errors from server response
 */
export function useValidationResultError() {
  return useUploadError({
    showToast: false, // Validation results are shown in UI, not toast
    logErrors: true,
    onError: (errorInfo, originalError) => {
      // Log validation errors for analysis
      if (errorInfo.category === 'validation') {
        console.info('Validation result error:', {
          error: errorInfo.title,
          hasDetails: !!originalError?.stats?.errors?.length,
          errorCount: originalError?.stats?.errorCount || 0,
          warningCount: originalError?.stats?.warningCount || 0
        });
      }
    }
  });
}