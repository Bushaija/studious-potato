import { useQuery } from "@tanstack/react-query";
import { 
  getReportVersions, 
  type GetReportVersionsResponse 
} from "@/fetchers/financial-reports/get-report-versions";

/**
 * Hook to fetch all versions of a financial report
 * 
 * @param reportId - The ID of the financial report
 * @returns Query result with report versions data
 * 
 * Requirements: 5.3, 5.4, 8.1, 8.2
 */
export function useReportVersions(reportId: number | string | undefined) {
  return useQuery<GetReportVersionsResponse>({
    queryFn: () => getReportVersions(reportId!),
    queryKey: ["financial-reports", "versions", reportId],
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000, // 5 minutes - versions don't change frequently
  });
}
