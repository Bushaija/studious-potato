import { useMutation, useQueryClient } from "@tanstack/react-query";
import {updateExecution, type UpdateExecutionRequest, type UpdateExecutionResponse, type UpdateExecutionParam } from "@/fetchers/execution/update-execution";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

type Variables = { params: UpdateExecutionParam; body: UpdateExecutionRequest };

interface UseUpdateExecutionParams {
  onSuccess?: (data: UpdateExecutionResponse) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

/**
 * Hook to update execution data with enhanced quarterly rollover information
 * 
 * The response includes:
 * - `entry`: The updated execution data entry
 * - `ui`: UI structure data (optional)
 * - `previousQuarterBalances`: Closing balances from the previous quarter
 * - `quarterSequence`: Quarter navigation metadata
 * - `cascadeImpact`: Information about affected subsequent quarters (optional)
 * 
 * Note: Updating a quarter may affect subsequent quarters' opening balances,
 * triggering cascade recalculation. The `cascadeImpact` field will indicate
 * which quarters were affected.
 * 
 * Requirements: 5.2, 6.3, 8.5
 * 
 * @param params - Optional callbacks for success, error, and period lock error handling
 * @returns Mutation hook for updating execution data
 */
export function useUpdateExecution(params?: UseUpdateExecutionParams) {
  const queryClient = useQueryClient();

  return useMutation<UpdateExecutionResponse, Error, Variables>({
    mutationFn: ({ params: execParams, body }) => updateExecution(execParams, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["execution", "list"] });
      queryClient.setQueryData(["execution", "detail", data.id], data);
      
      // Call custom success handler if provided
      params?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      // Check if this is a period lock error
      const lockError = checkPeriodLockError(error);
      
      if (lockError.isPeriodLockError) {
        // Call custom period lock error handler if provided
        if (params?.onPeriodLockError) {
          params.onPeriodLockError(error);
        } else {
          // Default: show toast with period lock message
          toast.error("Period Locked", {
            description: "This reporting period is locked. Contact an administrator to unlock.",
          });
        }
      } else {
        // Handle other errors
        toast.error("Failed to update execution data", {
          description: error.message || "An unexpected error occurred",
        });
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}



