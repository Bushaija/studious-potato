import { useQuery } from "@tanstack/react-query";
import { getDistricts, type GetDistrictsRequest } from "@/fetchers/districts/get-districts";

export function useGetDistricts(params?: GetDistrictsRequest) {
  return useQuery({
    queryKey: ['districts', params?.provinceId],
    queryFn: () => getDistricts(params),
    // Enable the query even without provinceId to fetch all districts for admin users
    enabled: true,
  });
}
