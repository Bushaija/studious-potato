/**
 * Period Lock Error Detection Utilities
 * 
 * Provides utilities for detecting and handling period lock errors
 * from API responses.
 */

export interface PeriodLockErrorInfo {
  isPeriodLockError: boolean;
  message: string;
  periodName?: string;
  projectName?: string;
  facilityName?: string;
  lockedBy?: string;
  lockedAt?: string;
}

/**
 * Checks if an error is a period lock error (403 Forbidden with lock message)
 * 
 * @param error - The error object from a mutation or API call
 * @returns Information about the period lock error
 * 
 * @example
 * ```tsx
 * const mutation = useMutation({
 *   onError: (error) => {
 *     const lockError = checkPeriodLockError(error);
 *     if (lockError.isPeriodLockError) {
 *       // Show period lock dialog
 *       setPeriodLockError(lockError);
 *     }
 *   }
 * });
 * ```
 */
export function checkPeriodLockError(error: any): PeriodLockErrorInfo {
  const errorMessage = error?.message || String(error);
  
  // Check for 403 status code or "locked" keyword in message
  const is403 = errorMessage.includes('403') || errorMessage.includes('Forbidden');
  const hasLockKeyword = 
    errorMessage.toLowerCase().includes('locked') ||
    errorMessage.toLowerCase().includes('period is locked') ||
    errorMessage.toLowerCase().includes('reporting period is locked');
  
  const isPeriodLockError = is403 && hasLockKeyword;
  
  if (!isPeriodLockError) {
    return {
      isPeriodLockError: false,
      message: errorMessage,
    };
  }
  
  // Extract period information from error message if available
  // The middleware returns: "This reporting period is locked due to an approved financial report. Contact an administrator to unlock."
  return {
    isPeriodLockError: true,
    message: errorMessage,
    // Additional info could be extracted from error.response.data if the API provides it
    // For now, we'll rely on the component to provide context from the form state
  };
}

/**
 * Creates a standardized period lock error message
 * 
 * @param periodName - Name of the locked period
 * @param projectName - Name of the project
 * @param facilityName - Name of the facility
 * @returns Formatted error message
 */
export function createPeriodLockErrorMessage(
  periodName?: string,
  projectName?: string,
  facilityName?: string
): string {
  const parts = [];
  
  if (periodName) parts.push(`Period: ${periodName}`);
  if (projectName) parts.push(`Project: ${projectName}`);
  if (facilityName) parts.push(`Facility: ${facilityName}`);
  
  const context = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  
  return `This reporting period is locked${context}. Contact an administrator to unlock.`;
}
