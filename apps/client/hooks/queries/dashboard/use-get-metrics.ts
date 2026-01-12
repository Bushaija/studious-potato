import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import getMetrics, { type GetMetricsRequest, type MetricsResponse } from "@/fetchers/dashboard/get-metrics";

export function useGetMetrics(
  params: GetMetricsRequest,
  options?: Omit<UseQueryOptions<MetricsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ["dashboard", "metrics", params.level, params.provinceId, params.districtId, params.projectType, params.quarter],
    queryFn: () => getMetrics(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export default useGetMetrics;
