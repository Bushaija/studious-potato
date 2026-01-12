import { ApiError } from "@/api-client/index";

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default retry configuration for approval operations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  delayMs: 1000,
  shouldRetry: (error: unknown) => {
    // Only retry on network errors or 5xx server errors
    if (error instanceof ApiError) {
      return error.isNetworkError() || error.status >= 500;
    }
    return false;
  },
};

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - The async operation to retry
 * @param config - Retry configuration
 * @returns Promise with the operation result
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = config.shouldRetry?.(error) ?? true;
      const isLastAttempt = attempt === config.maxRetries;
      
      if (!shouldRetry || isLastAttempt) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = config.delayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Get a user-friendly error message for common approval workflow errors
 * 
 * @param error - The error to format
 * @param context - Optional context about what operation failed
 * @returns Formatted error message
 */
export function getApprovalErrorMessage(error: unknown, context?: string): string {
  if (error instanceof ApiError) {
    const baseMessage = error.getUserMessage();
    
    if (context) {
      return `Failed to ${context}: ${baseMessage}`;
    }
    
    return baseMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
}

/**
 * Check if an error is recoverable (user can retry)
 * 
 * @param error - The error to check
 * @returns True if the error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Network errors and server errors are recoverable
    if (error.isNetworkError() || error.status >= 500) {
      return true;
    }
    
    // Conflict errors might be recoverable after refresh
    if (error.status === 409) {
      return true;
    }
    
    return false;
  }
  
  return false;
}

/**
 * Format validation errors from the API response
 * 
 * @param error - The API error
 * @returns Array of validation error messages
 */
export function formatValidationErrors(error: ApiError): string[] {
  if (!error.isValidationError() || !error.response) {
    return [];
  }
  
  const errors: string[] = [];
  
  // Handle Zod validation errors
  if (error.response.error?.issues) {
    for (const issue of error.response.error.issues) {
      const path = issue.path.join('.');
      const message = issue.message || 'Invalid value';
      errors.push(`${path}: ${message}`);
    }
  }
  
  // Handle generic validation messages
  if (error.response.message) {
    errors.push(error.response.message);
  }
  
  return errors;
}
