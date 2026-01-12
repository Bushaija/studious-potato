import { useQuery } from "@tanstack/react-query";
import { 
  compareVersions 
} from "@/fetchers/financial-reports/compare-versions";
import type { VersionComparison, CompareVersionsRequest } from "@/types/version-control";

/**
 * Hook to compare two versions of a financial report
 * 
 * @param reportId - The ID of the financial report
 * @param version1 - First version number to compare
 * @param version2 - Second version number to compare
 * @returns Query result with version comparison data
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function useVersionComparison(
  reportId: number | string | undefined,
  version1: string | undefined,
  version2: string | undefined
) {
  return useQuery<VersionComparison>({
    queryFn: () => compareVersions(reportId!, { version1: version1!, version2: version2! }),
    queryKey: ["financial-reports", "versions", "compare", reportId, version1, version2],
    enabled: !!reportId && !!version1 && !!version2,
    staleTime: 10 * 60 * 1000, // 10 minutes - comparison results are static
  });
}
