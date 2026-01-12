/**
 * Snapshot Corruption Error Detection Utility
 * 
 * Task 22: Add Snapshot Integrity Validation
 * Requirements: 10.3, 10.4, 10.5
 * 
 * Provides utilities for detecting and handling snapshot corruption errors
 * from API responses.
 */

/**
 * Snapshot corruption error details
 */
export interface SnapshotCorruptionError {
  isSnapshotCorrupted: boolean;
  reportId?: number;
  reportStatus?: string;
  errorMessage?: string;
  errorDetails?: string;
}

/**
 * Check if an error response indicates snapshot corruption
 * 
 * @param error - Error object from API call
 * @returns Snapshot corruption error details
 * 
 * @example
 * ```ts
 * const corruptionError = checkSnapshotCorruptionError(error);
 * if (corruptionError.isSnapshotCorrupted) {
 *   // Handle snapshot corruption
 * }
 * ```
 */
export function checkSnapshotCorruptionError(error: any): SnapshotCorruptionError {
  // Check if error response indicates snapshot corruption
  if (error?.response?.data?.error === "SNAPSHOT_CORRUPTED") {
    return {
      isSnapshotCorrupted: true,
      reportId: error.response.data.reportId,
      reportStatus: error.response.data.reportStatus,
      errorMessage: error.response.data.message,
      errorDetails: error.response.data.details,
    };
  }

  // Check if error message contains corruption indicators
  if (error?.message?.toLowerCase().includes("snapshot") && 
      error?.message?.toLowerCase().includes("corrupt")) {
    return {
      isSnapshotCorrupted: true,
      errorMessage: error.message,
    };
  }

  // Check if response data has snapshotCorrupted flag (from getOne endpoint)
  if (error?.response?.data?.snapshotCorrupted === true) {
    return {
      isSnapshotCorrupted: true,
      reportId: error.response.data.id,
      reportStatus: error.response.data.status,
      errorMessage: error.response.data.snapshotError,
    };
  }

  return {
    isSnapshotCorrupted: false,
  };
}

/**
 * Check if a report object has snapshot corruption flag
 * 
 * @param report - Report object from API
 * @returns True if report has corruption flag
 * 
 * @example
 * ```ts
 * if (isReportCorrupted(report)) {
 *   // Show error dialog
 * }
 * ```
 */
export function isReportCorrupted(report: any): boolean {
  return report?.snapshotCorrupted === true;
}

/**
 * Get snapshot corruption error message
 * 
 * @param report - Report object or error
 * @returns User-friendly error message
 */
export function getSnapshotCorruptionMessage(report: any): string {
  if (report?.snapshotError) {
    return report.snapshotError;
  }
  
  return "Snapshot integrity check failed. Report data may be corrupted.";
}
