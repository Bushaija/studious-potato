import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unlockPeriod } from "@/fetchers/period-locks";
import type { UnlockPeriodRequest, UnlockPeriodResponse } from "@/types/period-locks";
import { toast } from "sonner";

interface UseUnlockPeriodOptions {
  onSuccess?: (data: UnlockPeriodResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to unlock a reporting period (admin only)
 * 
 * @param options - Optional callbacks for success and error handling
 * @returns Mutation object with unlock function and status
 * 
 * Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function useUnlockPeriod(options?: UseUnlockPeriodOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lockId, data }: { lockId: number; data: UnlockPeriodRequest }) =>
      unlockPeriod(lockId, data),
    onSuccess: (data, variables) => {
      toast.success("Period unlocked successfully");
      
      // Invalidate period locks queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["period-locks"] });
      
      // Invalidate audit log for this specific lock
      queryClient.invalidateQueries({ queryKey: ["period-lock-audit", variables.lockId] });
      
      // Invalidate financial reports that might be affected
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      
      // Call user-provided onSuccess callback
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlock period");
      
      // Call user-provided onError callback
      options?.onError?.(error);
    },
  });
}
