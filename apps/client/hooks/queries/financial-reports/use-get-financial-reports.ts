import { useQuery } from "@tanstack/react-query";
import { 
  getFinancialReports, 
  type GetFinancialReportsRequest, 
  type GetFinancialReportsResponse 
} from "@/fetchers/financial-reports/get-financial-reports";

function useGetFinancialReports(query?: GetFinancialReportsRequest) {
  return useQuery<GetFinancialReportsResponse>({
    queryFn: () => getFinancialReports(query || {}),
    queryKey: [
      "financial-reports",
      "list",
      query?.facilityId ?? null,
      query?.projectId ?? null,
      query?.reportingPeriodId ?? null,
      query?.statementType ?? null,
      query?.page ?? 1,
      query?.limit ?? 20,
    ],
  });
}

export default useGetFinancialReports;
