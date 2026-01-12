import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, type UploadDocumentRequest, type UploadDocumentResponse } from "@/fetchers/documents/upload-document";
import { toast } from "sonner";

interface UseUploadDocumentParams {
  onSuccess?: (data: UploadDocumentResponse) => void;
  onError?: (error: Error) => void;
}

export function useUploadDocument(params?: UseUploadDocumentParams) {
  const queryClient = useQueryClient();

  return useMutation<UploadDocumentResponse, Error, UploadDocumentRequest>({
    mutationFn: uploadDocument,
    onSuccess: (data, variables) => {
      // Invalidate documents list for this execution entry
      queryClient.invalidateQueries({
        queryKey: ["documents", "execution", variables.executionEntryId],
      });

      toast.success("Document uploaded successfully");
      
      params?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error("Failed to upload document", {
        description: error.message || "An unexpected error occurred",
      });
      
      params?.onError?.(error);
    },
  });
}
