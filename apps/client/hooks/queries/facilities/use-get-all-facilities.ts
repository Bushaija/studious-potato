import getAllFacilities, {
  type FacilityWithDistrict,
} from "@/fetchers/facilities/get-all-facilities";
import { useQuery } from "@tanstack/react-query";

export function useGetAllFacilities() {
  return useQuery<FacilityWithDistrict[]>({
    queryFn: getAllFacilities,
    queryKey: ["facilities", "all"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
