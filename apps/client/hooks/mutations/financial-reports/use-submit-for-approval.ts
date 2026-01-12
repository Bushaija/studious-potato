import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  submitForApproval, 
  type SubmitForApprovalResponse 
} from "@/fetchers/financial-reports/submit-for-approval";

interface UseSubmitForApprovalOptions {
  onSuccess?: (data: SubmitForApprovalResponse) => void;
  onError?: (error: Error) => void;
}

export function useSubmitForApproval(options?: UseSubmitForApprovalOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation<SubmitForApprovalResponse, Error, number>({
    mutationFn: submitForApproval,
    onSuccess: (data, reportId) => {
      // Invalidate financial report queries to refetch
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "list"] });
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      queryClient.invalidateQueries({ queryKey: ["financial-report-metadata", reportId] });
      
      // Call user-provided onSuccess callback
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // Call user-provided onError callback
      options?.onError?.(error);
    },
  });

  return {
    submit: mutation.mutate,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export default useSubmitForApproval;
