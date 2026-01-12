import deleteReportingPeriod from "@/fetchers/reporting-periods/delete-reporting-period";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useDeleteReportingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReportingPeriod,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reporting-periods"] });
      queryClient.removeQueries({ queryKey: ["reporting-periods", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["reporting-periods", "current"] });
    },
    onError: (error) => {
      console.error("Failed to delete reporting period:", error);
    },
  });
}

export default useDeleteReportingPeriod;

