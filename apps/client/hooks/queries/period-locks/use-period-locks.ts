import { useQuery } from "@tanstack/react-query";
import { getPeriodLocks } from "@/fetchers/period-locks";
import type { GetPeriodLocksResponse } from "@/types/period-locks";

/**
 * Hook to fetch period locks for a facility
 * 
 * @param facilityId - The ID of the facility
 * @returns Query result with period locks data
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2
 */
export function usePeriodLocks(facilityId: number | undefined) {
  return useQuery<GetPeriodLocksResponse>({
    queryKey: ["period-locks", facilityId],
    queryFn: () => {
      if (!facilityId) {
        throw new Error("Facility ID is required");
      }
      return getPeriodLocks(facilityId);
    },
    enabled: !!facilityId,
    staleTime: 2 * 60 * 1000, // 2 minutes - locks can change when reports are approved/unlocked
  });
}
