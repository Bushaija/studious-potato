import { useMutation } from "@tanstack/react-query";
import { exportStatementPdf, type ExportStatementRequest } from "@/fetchers/financial-reports/generate-pdf";

interface UseExportStatementPdfOptions {
  onSuccess?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

function useExportStatementPdf(options?: UseExportStatementPdfOptions) {
  return useMutation<Blob, Error, ExportStatementRequest>({
    mutationFn: exportStatementPdf,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export default useExportStatementPdf;
