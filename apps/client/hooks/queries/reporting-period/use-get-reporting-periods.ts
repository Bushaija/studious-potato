import getReportingPeriods, { type GetReportingPeriodsRequest } from "@/fetchers/reporting-periods/get-reporting-periods";
import { useQuery } from "@tanstack/react-query";

export function useGetReportingPeriods(query: GetReportingPeriodsRequest = {}) {
  return useQuery({
    queryFn: () => getReportingPeriods(query),
    queryKey: ["reporting-periods", query],
  });
};


