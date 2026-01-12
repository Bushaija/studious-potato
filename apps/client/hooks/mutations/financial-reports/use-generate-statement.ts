import { useMutation } from "@tanstack/react-query";
import {
  generateFinancialStatement,
  type GenerateStatementRequest,
  type GenerateStatementResponse
} from "@/fetchers/financial-reports/generate-statement";

interface UseGenerateStatementOptions {
  onSuccess?: (data: GenerateStatementResponse) => void;
  onError?: (error: Error) => void;
}

function useGenerateStatement(options?: UseGenerateStatementOptions) {
  return useMutation<GenerateStatementResponse, Error, GenerateStatementRequest>({
    mutationFn: generateFinancialStatement,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.message.includes('400') || error.message.includes('404')) {
        return false;
      }
      // Retry up to 2 times for server errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export default useGenerateStatement;
