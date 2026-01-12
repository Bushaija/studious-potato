import { useState, useCallback } from "react";
import { checkPeriodLockError, type PeriodLockErrorInfo } from "@/lib/period-lock-error";

interface UsePeriodLockErrorOptions {
  periodName?: string;
  projectName?: string;
  facilityName?: string;
  onPeriodLockError?: (error: PeriodLockErrorInfo) => void;
}

/**
 * Hook for handling period lock errors in forms
 * 
 * Provides state management and error detection for period lock errors.
 * Use this hook in forms that edit planning or execution data.
 * 
 * @param options - Configuration options including period/project/facility names
 * @returns Object with error state and handler function
 * 
 * @example
 * ```tsx
 * function PlanningForm() {
 *   const { 
 *     periodLockError, 
 *     showPeriodLockDialog, 
 *     setShowPeriodLockDialog,
 *     handleMutationError 
 *   } = usePeriodLockError({
 *     periodName: "January 2024",
 *     projectName: "Malaria Control",
 *     facilityName: "Central Hospital"
 *   });
 * 
 *   const mutation = useMutation({
 *     onError: handleMutationError
 *   });
 * 
 *   return (
 *     <>
 *       <form>...</form>
 *       <PeriodLockErrorDialog
 *         open={showPeriodLockDialog}
 *         onOpenChange={setShowPeriodLockDialog}
 *         {...periodLockError}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function usePeriodLockError(options: UsePeriodLockErrorOptions = {}) {
  const [showPeriodLockDialog, setShowPeriodLockDialog] = useState(false);
  const [periodLockError, setPeriodLockError] = useState<PeriodLockErrorInfo | null>(null);

  /**
   * Handle mutation errors and detect period lock errors
   * Use this as the onError callback for mutations
   */
  const handleMutationError = useCallback((error: any) => {
    const lockError = checkPeriodLockError(error);
    
    if (lockError.isPeriodLockError) {
      // Enhance error info with context from options
      const enhancedError: PeriodLockErrorInfo = {
        ...lockError,
        periodName: options.periodName,
        projectName: options.projectName,
        facilityName: options.facilityName,
      };
      
      setPeriodLockError(enhancedError);
      setShowPeriodLockDialog(true);
      
      // Call custom handler if provided
      options.onPeriodLockError?.(enhancedError);
      
      return true; // Indicates error was handled
    }
    
    return false; // Indicates error was not a period lock error
  }, [options]);

  /**
   * Reset the error state
   */
  const resetError = useCallback(() => {
    setPeriodLockError(null);
    setShowPeriodLockDialog(false);
  }, []);

  return {
    periodLockError,
    showPeriodLockDialog,
    setShowPeriodLockDialog,
    handleMutationError,
    resetError,
  };
}
