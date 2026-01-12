import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getBudgetByFacility, { type GetBudgetByFacilityRequest, type BudgetByFacilityResponse } from "@/fetchers/dashboard/get-budget-by-facility";

export function useGetBudgetByFacility(
  params: GetBudgetByFacilityRequest,
  options?: Omit<UseQueryOptions<BudgetByFacilityResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "budget-by-facility", params.districtId, params.facilityId, params.projectType, params.quarter],
    queryFn: () => getBudgetByFacility(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetBudgetByFacility;
