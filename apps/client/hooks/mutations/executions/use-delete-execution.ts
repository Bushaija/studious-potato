import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteExecution, type DeleteExecutionRequest, type DeleteExecutionResponse } from "@/fetchers/execution/delete-execution";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

interface UseDeleteExecutionParams {
  onSuccess?: (data: DeleteExecutionResponse, variables: DeleteExecutionRequest) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

export function useDeleteExecution(params?: UseDeleteExecutionParams) {
  const queryClient = useQueryClient();

  return useMutation<DeleteExecutionResponse, Error, DeleteExecutionRequest>({
    mutationFn: deleteExecution,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["execution", "list"] });
      queryClient.removeQueries({ queryKey: ["execution", "detail", variables.id] });
      
      toast.success("Execution data deleted successfully");
      
      // Call custom success handler if provided
      params?.onSuccess?.(data, variables);
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
        toast.error("Failed to delete execution data", {
          description: error.message || "An unexpected error occurred",
        });
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}



