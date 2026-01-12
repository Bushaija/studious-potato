import getFacilitiesByDistrict from "@/fetchers/facilities/get-facilities-by-district";
import { useQuery } from "@tanstack/react-query";

export function useGetFacilitiesByDistrict({ districtId }: { districtId?: number }) {
  return useQuery({
    queryFn: () => getFacilitiesByDistrict({ districtId: districtId as number }),
    queryKey: ["facilities", "by-district", districtId],
    enabled: typeof districtId === "number" && districtId > 0,
  });
}


