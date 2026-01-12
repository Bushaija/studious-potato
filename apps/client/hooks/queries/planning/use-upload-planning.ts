import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  uploadPlanningFile, 
  fileToBase64
} from "@/fetchers/planning/upload-planning";
import { handleUploadError } from "@/lib/upload-errors";
import type { 
  UploadPlanningRequest,
  UploadPlanningResponse,
  UseUploadPlanningParams,
  UploadPlanningMutationData
} from "@/features/planning/types";

export function useUploadPlanning() {
  const queryClient = useQueryClient();

  return useMutation<UploadPlanningResponse, Error, UploadPlanningMutationData>({
    mutationFn: async ({ file, params }: UploadPlanningMutationData) => {
      // Convert file to base64
      const fileData = await fileToBase64(file);
      
      const request: UploadPlanningRequest = {
        ...params,
        fileName: file.name,
        fileData
      };

      return await uploadPlanningFile(request);
    },
    onSuccess: (data) => {
      // Invalidate planning queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      
      if (data.success) {
        toast.success("File uploaded successfully!");
      } else {
        toast.warning("Upload completed with issues. Please review the results.");
      }
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      
      // Use enhanced error handling for better user experience
      const errorInfo = handleUploadError(error);
      
      // Only show toast for certain error types (others handled by components)
      if (errorInfo.category === 'network' || errorInfo.category === 'server') {
        toast.error(errorInfo.title, {
          description: errorInfo.description,
          duration: 6000,
        });
      }
    },
  });
}