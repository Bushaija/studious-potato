import { useMutation, useQueryClient } from "@tanstack/react-query";
import {createExecution, type CreateExecutionRequest, type CreateExecutionResponse } from "@/fetchers/execution/create-execution";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

interface UseCreateExecutionParams {
  onSuccess?: (data: CreateExecutionResponse) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

/**
 * Hook to create new execution data with enhanced quarterly rollover information
 * 
 * The response includes:
 * - `entry`: The created execution data entry
 * - `ui`: UI structure data (optional)
 * - `previousQuarterBalances`: Closing balances from the previous quarter (if Q2, Q3, or Q4)
 * - `quarterSequence`: Quarter navigation metadata
 * 
 * This enables automatic balance rollover for financial continuity when creating
 * Q2, Q3, or Q4 executions.
 * 
 * Requirements: 5.2, 6.2
 * 
 * @param params - Optional callbacks for success, error, and period lock error handling
 * @returns Mutation hook for creating execution data
 */
export function useCreateExecution(params?: UseCreateExecutionParams) {
  const queryClient = useQueryClient();

  return useMutation<CreateExecutionResponse, Error, CreateExecutionRequest>({
    mutationFn: createExecution,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["execution", "list", variables.projectId ?? null, variables.facilityId ?? null],
      });

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
        // toast.error("Failed to create execution data", {
        //   description: error.message || "An unexpected error occurred",
        // });
        console.error(error.message)
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}



