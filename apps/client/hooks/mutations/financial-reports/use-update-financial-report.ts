import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFinancialReport, type UpdateFinancialReportData } from "@/fetchers/financial-reports/update-financial-report";

interface UpdateFinancialReportParams {
  reportId: number;
  data: UpdateFinancialReportData;
}

function useUpdateFinancialReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, data }: UpdateFinancialReportParams) =>
      updateFinancialReport(reportId, data),
    onSuccess: (_, variables) => {
      // Invalidate financial reports list to refetch
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "list"] });
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      // Invalidate the specific report
      queryClient.invalidateQueries({ 
        queryKey: ["financial-reports", variables.reportId] 
      });
    },
  });
}

export default useUpdateFinancialReport;
