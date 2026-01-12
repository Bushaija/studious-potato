import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePlanning } from "@/fetchers/planning/delete-planning";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

interface UseDeletePlanningParams {
  onSuccess?: (deletedId: string | number) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

export function useDeletePlanning(params?: UseDeletePlanningParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deletePlanning(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: ["planning", "detail", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "summary"] });
      
      toast.success("Planning data deleted successfully");
      
      // Call custom success handler if provided
      params?.onSuccess?.(deletedId);
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
        toast.error("Failed to delete planning data", {
          description: error.message || "An unexpected error occurred",
        });
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}