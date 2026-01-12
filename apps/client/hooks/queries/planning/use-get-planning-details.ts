import { useQuery } from "@tanstack/react-query";
import { getPlanningById } from "@/fetchers/planning/get-planning-by-id";

export function usePlanningDetail (id: string | number | null) {
    return useQuery({
        queryKey: ["planning", id],
        queryFn: () => getPlanningById(id!),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 2
    });
};