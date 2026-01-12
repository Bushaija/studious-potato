import { useQuery } from "@tanstack/react-query";
import { getPlanningDataSummary } from "@/fetchers/planning/get-data-summary";

interface UsePlanningDataSummaryParams {
  projectId: string;
  facilityId: string;
  reportingPeriodId?: string;
  enabled?: boolean;
}

export function usePlanningDataSummary({
  projectId,
  facilityId,
  reportingPeriodId,
  enabled = true
}: UsePlanningDataSummaryParams) {
  return useQuery({
    queryKey: ["planning", "summary", { projectId, facilityId, reportingPeriodId }],
    queryFn: () => getPlanningDataSummary({ projectId, facilityId, reportingPeriodId }),
    enabled: enabled && !!projectId && !!facilityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}