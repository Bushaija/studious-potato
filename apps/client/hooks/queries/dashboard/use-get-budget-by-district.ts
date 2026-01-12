import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getBudgetByDistrict, { type GetBudgetByDistrictRequest, type BudgetByDistrictResponse } from "@/fetchers/dashboard/get-budget-by-district";

export function useGetBudgetByDistrict(
  params: GetBudgetByDistrictRequest,
  options?: Omit<UseQueryOptions<BudgetByDistrictResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "budget-by-district", params.provinceId, params.projectType, params.quarter],
    queryFn: () => getBudgetByDistrict(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetBudgetByDistrict;
