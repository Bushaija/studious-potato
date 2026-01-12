import { honoClient as client } from "@/api-client/index";
import type { DownloadTemplateRequest } from "@/features/planning/types";

export async function downloadPlanningTemplate(request: DownloadTemplateRequest): Promise<Blob> {
  const response = await client.planning.template.$get({
    query: request
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Template download failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}