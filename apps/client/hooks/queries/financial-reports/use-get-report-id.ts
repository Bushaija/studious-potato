import { useQuery } from "@tanstack/react-query";
import { honoClient as client } from "@/api-client/index";
import { getFinancialReports } from "@/fetchers/financial-reports/get-financial-reports";

interface UseGetReportIdParams {
  reportingPeriodId: number;
  projectType: "HIV" | "Malaria" | "TB";
  statementType: "revenue-expenditure" | "assets-liabilities" | "cash-flow" | "net-assets-changes" | "budget-vs-actual";
  enabled?: boolean;
}

/**
 * Hook to fetch the financial report ID based on reporting period, project type, and statement type
 * Returns the most recent report matching the criteria, or null if no report exists
 */
function useGetReportId({ 
  reportingPeriodId, 
  projectType, 
  statementType,
  enabled = true 
}: UseGetReportIdParams) {
  // Map statement type to report type enum
  const reportTypeMap = {
    "revenue-expenditure": "revenue_expenditure",
    "assets-liabilities": "balance_sheet",
    "cash-flow": "cash_flow",
    "net-assets-changes": "net_assets_changes",
    "budget-vs-actual": "budget_vs_actual",
  } as const;

  return useQuery({
    queryKey: [
      "financial-report-id",
      reportingPeriodId,
      projectType,
      statementType,
    ],
    queryFn: async () => {
      try {
        // First, get the project ID from project type
        const projectsResponse = await (client as any).projects.$get({
          query: {},
        });

        if (!projectsResponse.ok) {
          return null;
        }

        const projectsData = await projectsResponse.json();
        
        // The API returns an array directly, not an object with a projects property
        const projects = Array.isArray(projectsData) ? projectsData : [];
        const project = projects.find(
          (p: any) => p.projectType === projectType
        );

        if (!project) {
          return null;
        }

        // Now query financial reports with the project ID
        // Note: The list endpoint doesn't support reportingPeriodId filtering,
        // so we'll need to filter client-side
        const queryParams = {
          projectId: project.id,
          reportType: reportTypeMap[statementType],
          limit: 50, // Get more results to filter client-side
          page: 1,
        };

        const reportsData = await getFinancialReports(queryParams);
        
        // Filter reports by reporting period ID (client-side filtering)
        const matchingReport = reportsData.reports?.find(
          (report: any) => report.reportingPeriodId === reportingPeriodId
        );
        
        return matchingReport ? matchingReport.id : null;
      } catch (error) {
        return null;
      }
    },
    enabled: enabled && !!reportingPeriodId && !!projectType,
    staleTime: 1000 * 60 * 5, // 5 minutes - report IDs don't change frequently
    retry: 1, // Only retry once on failure
  });
}

export default useGetReportId;
