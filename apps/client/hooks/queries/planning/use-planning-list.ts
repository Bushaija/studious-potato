import { useQuery } from "@tanstack/react-query";
import { getPlanningList } from "@/fetchers/planning/get-planning-list";
import type { PlanningListParams } from "@/fetchers/planning/types";

export function usePlanningList(params?: PlanningListParams) {
    return useQuery({
        queryKey: ["planning", "list", params],
        queryFn: () => getPlanningList(params),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    })
}