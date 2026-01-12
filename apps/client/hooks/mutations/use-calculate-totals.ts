import { useMutation } from "@tanstack/react-query";
import { calculatePlanningTotals } from "@/fetchers/planning/calculate-totals";

export function useCalculatePlanningTotals() {
  return useMutation({
    mutationFn: calculatePlanningTotals,
    retry: 2,
  });
}