import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFinancialReport } from "@/fetchers/financial-reports/delete-financial-report";

function useDeleteFinancialReport() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number | string>({
    mutationFn: deleteFinancialReport,
    onSuccess: () => {
      // Invalidate financial reports list to refetch
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "list"] });
    },
  });
}

export default useDeleteFinancialReport;
