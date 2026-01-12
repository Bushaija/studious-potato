import getReportingPeriodsByYear from "@/fetchers/reporting-periods/get-reporting-periods-by-year";
import { useQuery } from "@tanstack/react-query";

export function useGetReportingPeriodsByYear({ year }: { year?: number }) {
  return useQuery({
    queryFn: () => getReportingPeriodsByYear({ year: year! }),
    queryKey: ["reporting-periods", "year", year],
    enabled: typeof year === "number",
  });
};

