import { useQuery } from "@tanstack/react-query";
import { 
  checkExistingExecution, 
  type CheckExistingExecutionRequest, 
  type CheckExistingExecutionResponse 
} from "@/fetchers/execution/check-existing-execution";

function useCheckExistingExecution(query: CheckExistingExecutionRequest) {
  return useQuery<CheckExistingExecutionResponse>({
    queryFn: () => checkExistingExecution(query),
    queryKey: [
      "execution",
      "check-existing",
      query?.projectId ?? null,
      query?.facilityId ?? null,
      query?.reportingPeriodId ?? null,
    ],
    enabled: Boolean(
      query?.projectId && 
      query?.facilityId && 
      query?.reportingPeriodId
    ),
    // Force fresh data on every mount to ensure latest quarterly data is loaded
    staleTime: 0,
    // Always refetch when component mounts to get the latest data
    refetchOnMount: 'always',
    // Refetch when window regains focus to catch updates from other tabs
    refetchOnWindowFocus: true,
  });
}

export default useCheckExistingExecution;
