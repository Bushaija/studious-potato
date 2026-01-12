import getReportingPeriodById from "@/fetchers/reporting-periods/get-reporting-period-by-id";
import { useQuery } from "@tanstack/react-query";

export function useGetReportingPeriodById({ id }: { id?: string | number }) {
  return useQuery({
    queryFn: () => getReportingPeriodById({ id: id! }),
    queryKey: ["reporting-periods", id],
    enabled: !!id,
  });
};

