import { useQuery } from "@tanstack/react-query";
import { getExecutionQuarterlySummary, type GetExecutionQuarterlySummaryRequest, type GetExecutionQuarterlySummaryResponse } from "@/fetchers/execution/get-quarterly-summary";

export function useGetExecutionQuarterlySummary(query: GetExecutionQuarterlySummaryRequest) {
  return useQuery<GetExecutionQuarterlySummaryResponse>({
    queryFn: () => getExecutionQuarterlySummary(query),
    queryKey: ["execution", "quarterly-summary", query?.projectId ?? null, query?.facilityId ?? null, query?.year ?? null],
    enabled: !!(query && (query.projectId || query.facilityId) && query.year != null),
  });
}



