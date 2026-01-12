import getPlanningById from "@/fetchers/planning/get-planning-by-id";
import { useQuery } from "@tanstack/react-query";
import type { GetPlanningByIdRequest } from "@/fetchers/planning/get-planning-by-id";

function useGetPlanningById({ id }: GetPlanningByIdRequest) {
  return useQuery({
    queryFn: () => getPlanningById({ id }),
    queryKey: ["planning", "detail", id],
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export default useGetPlanningById;



