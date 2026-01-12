import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getDistrictApprovals, { type GetDistrictApprovalsRequest, type DistrictApprovalsResponse } from "@/fetchers/dashboard/get-district-approvals";

export function useGetDistrictApprovals(
  params: GetDistrictApprovalsRequest,
  options?: Omit<UseQueryOptions<DistrictApprovalsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "district-approvals", params.districtId, params.facilityId, params.projectType, params.quarter],
    queryFn: () => getDistrictApprovals(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetDistrictApprovals;
