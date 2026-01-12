import { useQuery } from "@tanstack/react-query";
import { 
  getDafQueue, 
  type GetDafQueueRequest, 
  type GetDafQueueResponse 
} from "@/fetchers/financial-reports/get-daf-queue";

/**
 * Hook to fetch DAF approval queue
 * Requirements: 6.1-6.4, 3.1, 3.2
 * 
 * Fetches reports pending DAF approval from facilities within the user's hierarchy.
 * Automatically refetches on window focus and includes pagination support.
 */
function useGetDafQueue(query?: GetDafQueueRequest) {
  return useQuery<GetDafQueueResponse>({
    queryFn: () => getDafQueue(query || {}),
    queryKey: [
      "financial-reports",
      "daf-queue",
      query?.page ?? 1,
      query?.limit ?? 20,
      query?.status ?? 'pending',
    ],
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}

export default useGetDafQueue;
