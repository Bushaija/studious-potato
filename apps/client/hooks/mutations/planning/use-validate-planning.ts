import { useMutation } from "@tanstack/react-query";
import { validatePlanning } from "@/fetchers/planning/validate-planning";

export function useValidatePlanning() {
  return useMutation({
    mutationFn: validatePlanning,
    retry: 2,
  });
}