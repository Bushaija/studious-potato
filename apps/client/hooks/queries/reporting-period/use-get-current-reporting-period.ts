import getCurrentReportingPeriod, { type GetCurrentReportingPeriodResponse } from "@/fetchers/reporting-periods/get-current";
import { useQuery } from "@tanstack/react-query";

export function useGetCurrentReportingPeriod() {
  return useQuery<GetCurrentReportingPeriodResponse>({
    queryFn: getCurrentReportingPeriod,
    queryKey: ["reporting-periods", "current"],
  });
};

