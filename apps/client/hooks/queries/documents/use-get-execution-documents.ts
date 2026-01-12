import { useQuery } from "@tanstack/react-query";
import { getExecutionDocuments, type GetExecutionDocumentsResponse } from "@/fetchers/documents/get-execution-documents";

interface UseGetExecutionDocumentsParams {
  executionEntryId: number;
  enabled?: boolean;
}

export function useGetExecutionDocuments({
  executionEntryId,
  enabled = true,
}: UseGetExecutionDocumentsParams) {
  return useQuery<GetExecutionDocumentsResponse, Error>({
    queryKey: ["documents", "execution", executionEntryId],
    queryFn: () => getExecutionDocuments(executionEntryId),
    enabled: enabled && !!executionEntryId,
  });
}
