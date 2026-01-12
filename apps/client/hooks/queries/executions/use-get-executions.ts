import { useQuery } from "@tanstack/react-query";
import { getExecutions, type GetExecutionsRequest, type GetExecutionsResponse } from "@/fetchers/execution/get-executions";

function useGetExecutions(query: GetExecutionsRequest) {
  return useQuery<GetExecutionsResponse>({
    queryFn: () => getExecutions(query),
    queryKey: [
      "execution",
      "list",
      query?.projectId ?? null,
      query?.facilityId ?? null,
      query?.reportingPeriodId ?? null,
      query?.quarter ?? null,
      query?.year ?? null,
      (query as any)?.facilityName ?? null,
      (query as any)?.facilityType ?? null,
      (query as any)?.projectType ?? null,
      (query as any)?.districtId ?? null,
      query?.page ?? 1,
      query?.limit ?? 20,
    ],
    enabled: Boolean(query && Object.keys(query as any).length > 0),
  });
}

export default useGetExecutions;


