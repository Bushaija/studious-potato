import getPlanning from "@/fetchers/planning/get-planning";
import { useQuery } from "@tanstack/react-query";
import type { GetPlanningRequest } from "@/fetchers/planning/get-planning";

function useGetPlanning(filters: GetPlanningRequest = {}) {
  return useQuery({
    queryFn: () => getPlanning(filters),
    queryKey: ["planning", "list", filters],
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export default useGetPlanning;



