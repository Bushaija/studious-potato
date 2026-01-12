import { useQuery } from "@tanstack/react-query";
import { getExecutionById, type GetExecutionByIdRequest, type GetExecutionByIdResponse } from "@/fetchers/execution/get-execution-by-id";

/**
 * Hook to fetch execution data by ID with enhanced quarterly rollover information
 * 
 * The response includes:
 * - `entry`: The execution data entry
 * - `ui`: UI structure data (optional)
 * - `previousQuarterBalances`: Closing balances from the previous quarter for Section D and E
 * - `quarterSequence`: Quarter navigation metadata (current, previous, next quarters)
 * 
 * Requirements: 5.1, 6.1
 * 
 * @param id - The execution ID to fetch
 * @returns Query result with enhanced execution response including previous quarter balances
 */
export function useGetExecutionById({ id }: GetExecutionByIdRequest) {
  return useQuery<GetExecutionByIdResponse>({
    queryFn: () => getExecutionById({ id }),
    queryKey: ["execution", "detail", id],
    enabled: id !== undefined && id !== null && id !== "",
  });
}




