import { useQuery } from "@tanstack/react-query";
import getFacilityOverview, { type GetFacilityOverviewRequest } from "@/fetchers/dashboard/get-facility-overview";

export function useGetFacilityOverview(params: GetFacilityOverviewRequest = {}) {
  return useQuery({
    queryKey: ["dashboard", "facility-overview", params.facilityId],
    queryFn: () => getFacilityOverview(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useGetFacilityOverview;
