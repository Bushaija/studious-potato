import { useMutation } from "@tanstack/react-query";
import { calculateExecutionBalances, type CalculateBalancesRequest, type CalculateBalancesResponse } from "@/fetchers/execution/calculate-balances";

export function useCalculateExecutionBalances() {
  return useMutation<CalculateBalancesResponse, Error, CalculateBalancesRequest>({
    mutationFn: calculateExecutionBalances,
  });
};


