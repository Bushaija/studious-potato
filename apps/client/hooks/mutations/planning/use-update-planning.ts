// import updatePlanning from "@/fetchers/planning/update-planning";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import type { UpdatePlanningRequest } from "@/fetchers/planning/update-planning";

// function useUpdatePlanning() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: updatePlanning,
//     onSuccess: (data, variables) => {
//       // Invalidate related queries
//       queryClient.invalidateQueries({
//         queryKey: ["planning", "list"]
//       });
      
//       // Update the specific planning data in cache
//       queryClient.setQueryData(
//         ["planning", "detail", variables.id],
//         data
//       );
//     },
//     onError: (error) => {
//       console.error("Failed to update planning data:", error);
//     },
//   });
// }

// export default useUpdatePlanning;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePlanning } from "@/fetchers/planning/update-planning";
import type { UpdatePlanningDataRequest } from "@/fetchers/planning/types";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

interface UseUpdatePlanningParams {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

export function useUpdatePlanning(params?: UseUpdatePlanningParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdatePlanningDataRequest }) =>
      updatePlanning(id, data),
    onSuccess: (data, variables) => {
      // Update specific queries
      queryClient.setQueryData(["planning", "detail", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      
      // If reportingPeriodId changed, invalidate summary
      if (variables.data.reportingPeriodId) {
        queryClient.invalidateQueries({ queryKey: ["planning", "summary"] });
      }
      
      toast.success("Planning data updated successfully");
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
        toast.error("Failed to update planning data", {
          description: error.message || "An unexpected error occurred",
        });
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}

