import getAccessibleFacilities, {
  type AccessibleFacility,
} from "@/fetchers/facilities/get-accessible-facilities";
import { useQuery } from "@tanstack/react-query";

export function useGetAccessibleFacilities() {
  return useQuery<AccessibleFacility[]>({
    queryFn: getAccessibleFacilities,
    queryKey: ["facilities", "accessible"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
