import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  createReportFromStatement, 
  type CreateReportFromStatementRequest,
  type CreateReportFromStatementResponse 
} from "@/fetchers/financial-reports/create-report-from-statement";

interface UseCreateReportFromStatementOptions {
  onSuccess?: (data: CreateReportFromStatementResponse) => void;
  onError?: (error: Error) => void;
}

export function useCreateReportFromStatement(options?: UseCreateReportFromStatementOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation<CreateReportFromStatementResponse, Error, CreateReportFromStatementRequest>({
    mutationFn: createReportFromStatement,
    onSuccess: (data) => {
      // Invalidate queries to refetch with new report
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      queryClient.invalidateQueries({ queryKey: ["financial-report-id"] });
      
      // Call user-provided onSuccess callback
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // Call user-provided onError callback
      options?.onError?.(error);
    },
  });

  return {
    createReport: mutation.mutate,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

export default useCreateReportFromStatement;
