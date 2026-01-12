import { useQuery } from "@tanstack/react-query";
import getFacilityHierarchy from "@/fetchers/facilities/get-facility-hierarchy";

export function useGetFacilityHierarchy(facilityId: number | null | undefined) {
  return useQuery({
    queryKey: ["facility-hierarchy", facilityId],
    queryFn: () => {
      if (!facilityId) {
        throw new Error("Facility ID is required");
      }
      return getFacilityHierarchy(facilityId);
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
