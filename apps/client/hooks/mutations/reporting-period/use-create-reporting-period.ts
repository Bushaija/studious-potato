import createReportingPeriod from "@/fetchers/reporting-periods/create-reporting-period";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useCreateReportingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReportingPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting-periods"] });
      queryClient.invalidateQueries({ queryKey: ["reporting-periods", "current"] });
    },
    onError: (error) => {
      console.error("Failed to create reporting period:", error);
    },
  });
}

export default useCreateReportingPeriod;

