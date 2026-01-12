import getFacilityById from "@/fetchers/facilities/get-facility-by-id";
import { useQuery } from "@tanstack/react-query";

export function useGetFacilityById(id?: number | string, enabled: boolean = true) {
  return useQuery({
    queryFn: () => getFacilityById({ id: id! }),
    queryKey: ["facilities", id],
    enabled: enabled && id !== undefined && id !== null,
  });
}


