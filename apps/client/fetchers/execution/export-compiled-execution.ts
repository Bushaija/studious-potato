import { honoClient as client } from "@/api-client/index";
import type { InferRequestType } from "hono/client";

// Type inference for request parameters (query)
export type ExportCompiledExecutionRequest = InferRequestType<
  (typeof client)["execution"]["compiled"]["export"]["$get"]
>["query"];

export interface ExportCompiledExecutionOptions {
  query: ExportCompiledExecutionRequest;
  filename?: string;
}

export async function exportCompiledExecution({ 
  query, 
  filename 
}: ExportCompiledExecutionOptions) {
  const response = await (client as any).execution.compiled.export.$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  // Get the blob from the response
  const blob = await response.blob();
  
  // Extract filename from Content-Disposition header if not provided
  const contentDisposition = response.headers.get("Content-Disposition");
  const defaultFilename = contentDisposition
    ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
    : `compiled-execution-report.${query.format || "pdf"}`;

  // Create download link and trigger download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, filename: filename || defaultFilename };
}
