import updateReportingPeriod from "@/fetchers/reporting-periods/update-reporting-period";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateReportingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReportingPeriod,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reporting-periods"] });
      queryClient.setQueryData(["reporting-periods", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["reporting-periods", "current"] });
    },
    onError: (error) => {
      console.error("Failed to update reporting period:", error);
    },
  });
}


