import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getProvinceApprovals, { type GetProvinceApprovalsRequest, type ProvinceApprovalsResponse } from "@/fetchers/dashboard/get-province-approvals";

export function useGetProvinceApprovals(
  params: GetProvinceApprovalsRequest,
  options?: Omit<UseQueryOptions<ProvinceApprovalsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "province-approvals", params.provinceId, params.projectType, params.quarter],
    queryFn: () => getProvinceApprovals(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetProvinceApprovals;
