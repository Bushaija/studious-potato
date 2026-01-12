import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getProgramDistribution, { type GetProgramDistributionRequest, type ProgramDistributionResponse } from "@/fetchers/dashboard/get-program-distribution";

export function useGetProgramDistribution(
  params: GetProgramDistributionRequest,
  options?: Omit<UseQueryOptions<ProgramDistributionResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "program-distribution", params.level, params.provinceId, params.districtId, params.quarter],
    queryFn: () => getProgramDistribution(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetProgramDistribution;
