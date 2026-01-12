import { useQuery } from "@tanstack/react-query";
import { 
  getDgQueue, 
  type GetDgQueueRequest, 
  type GetDgQueueResponse 
} from "@/fetchers/financial-reports/get-dg-queue";

/**
 * Hook to fetch DG approval queue
 * Requirements: 6.1-6.4, 5.3, 3.4-3.8
 * 
 * Fetches reports approved by DAF and pending DG approval from facilities within the user's hierarchy.
 * Automatically refetches on window focus and includes pagination support.
 */
function useGetDgQueue(query?: GetDgQueueRequest) {
  return useQuery<GetDgQueueResponse>({
    queryFn: () => getDgQueue(query || {}),
    queryKey: [
      "financial-reports",
      "dg-queue",
      query?.page ?? 1,
      query?.limit ?? 20,
      query?.status ?? 'pending',
    ],
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}

export default useGetDgQueue;
