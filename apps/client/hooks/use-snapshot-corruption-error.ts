"use client";

import { useState, useCallback } from "react";
import { checkSnapshotCorruptionError, type SnapshotCorruptionError } from "@/lib/snapshot-corruption-error";

/**
 * Hook for managing snapshot corruption error state
 * 
 * Task 22: Add Snapshot Integrity Validation
 * Requirements: 10.3, 10.4, 10.5
 * 
 * @example
 * ```tsx
 * const { 
 *   handleError, 
 *   showCorruptionDialog, 
 *   setShowCorruptionDialog, 
 *   corruptionError 
 * } = useSnapshotCorruptionError();
 * 
 * // In your query error handler
 * if (error) {
 *   handleError(error);
 * }
 * 
 * // In your component
 * <SnapshotCorruptionErrorDialog
 *   open={showCorruptionDialog}
 *   onOpenChange={setShowCorruptionDialog}
 *   reportId={corruptionError.reportId}
 *   reportStatus={corruptionError.reportStatus}
 * />
 * ```
 */
export function useSnapshotCorruptionError() {
  const [showCorruptionDialog, setShowCorruptionDialog] = useState(false);
  const [corruptionError, setCorruptionError] = useState<SnapshotCorruptionError>({
    isSnapshotCorrupted: false,
  });

  /**
   * Handle error and check if it's a snapshot corruption error
   * If it is, show the corruption dialog
   */
  const handleError = useCallback((error: any) => {
    const corruptionCheck = checkSnapshotCorruptionError(error);
    
    if (corruptionCheck.isSnapshotCorrupted) {
      setCorruptionError(corruptionCheck);
      setShowCorruptionDialog(true);
      return true; // Indicates error was handled
    }
    
    return false; // Indicates error was not a corruption error
  }, []);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setCorruptionError({ isSnapshotCorrupted: false });
    setShowCorruptionDialog(false);
  }, []);

  return {
    handleError,
    showCorruptionDialog,
    setShowCorruptionDialog,
    corruptionError,
    resetError,
  };
}
