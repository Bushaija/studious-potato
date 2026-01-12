import { useQuery } from "@tanstack/react-query";
import getPlannedFacilities, { type PlannedFacility } from "@/fetchers/facilities/get-planned-facilities";

function useGetPlannedFacilities() {
  return useQuery<PlannedFacility[]>({
    queryFn: getPlannedFacilities,
    queryKey: ["facilities", "planned"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default useGetPlannedFacilities;