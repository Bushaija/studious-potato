// import createPlanning from "@/fetchers/planning/create-planning";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import type { CreatePlanningRequest } from "@/fetchers/planning/create-planning";

// function useCreatePlanning() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: createPlanning,
//     onSuccess: (data, variables) => {
//       // Invalidate related queries
//       queryClient.invalidateQueries({
//         queryKey: ["planning", "list"]
//       });
      
//       // Add the new planning data to cache
//       queryClient.setQueryData(
//         ["planning", "detail", data.id],
//         data
//       );
//     },
//     onError: (error) => {
//       console.error("Failed to create planning data:", error);
//     },
//   });
// }

// export default useCreatePlanning;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlanning } from "@/fetchers/planning/create-planning";
import type { CreatePlanningDataRequest } from "@/fetchers/planning/types";
import { toast } from "sonner";
import { checkPeriodLockError } from "@/lib/period-lock-error";

interface UseCreatePlanningParams {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onPeriodLockError?: (error: any) => void;
}

export function useCreatePlanning(params?: UseCreatePlanningParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanningDataRequest) => createPlanning(data),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      queryClient.invalidateQueries({ 
        queryKey: ["planning", "summary", {
          projectId: variables.projectId,
          facilityId: variables.facilityId,
          reportingPeriodId: variables.reportingPeriodId
        }]
      });
      
      // Update the detail query cache
      queryClient.setQueryData(["planning", "detail", (data as any).id], data);
      
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
        toast.error("Failed to create planning data", {
          description: error.message || "An unexpected error occurred",
        });
      }
      
      // Call custom error handler if provided
      params?.onError?.(error);
    },
  });
}



