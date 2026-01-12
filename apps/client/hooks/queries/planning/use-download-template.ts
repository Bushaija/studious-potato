import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  downloadPlanningTemplate, 
  downloadBlob
} from "@/fetchers/planning/download-template";
import type { 
  DownloadTemplateRequest,
  DownloadTemplateMutationData
} from "@/features/planning/types";

export function useDownloadTemplate() {
  return useMutation<void, Error, DownloadTemplateMutationData>({
    mutationFn: async ({ projectType, facilityType, format, filename }: DownloadTemplateMutationData) => {
      const blob = await downloadPlanningTemplate({
        projectType,
        facilityType,
        format
      });

      // Generate filename if not provided
      const defaultFilename = `planning_template_${projectType}_${facilityType}.${format}`;
      const downloadFilename = filename || defaultFilename;

      downloadBlob(blob, downloadFilename);
    },
    onSuccess: () => {
      toast.success("Template downloaded successfully!");
    },
    onError: (error: Error) => {
      console.error('Template download error:', error);
      toast.error(`Template download failed: ${error.message}`);
    },
  });
}