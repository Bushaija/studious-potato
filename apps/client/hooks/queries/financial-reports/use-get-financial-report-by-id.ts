import { useQuery } from "@tanstack/react-query";
import { 
  getFinancialReportById, 
  type GetFinancialReportByIdResponse 
} from "@/fetchers/financial-reports/get-financial-report-by-id";

function useGetFinancialReportById(id: number | string | undefined) {
  return useQuery<GetFinancialReportByIdResponse>({
    queryFn: () => getFinancialReportById(id!),
    queryKey: ["financial-reports", "detail", id],
    enabled: !!id,
  });
}

export default useGetFinancialReportById;
