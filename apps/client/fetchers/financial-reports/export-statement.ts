import { honoClient as client } from "@/api-client/index";
import type { InferRequestType } from "hono/client";

// Type inference for request body
export type ExportStatementRequest = InferRequestType<
  (typeof client)["financial-reports"]["export-statement"]["$post"]
>["json"];

export interface ExportStatementOptions {
  json: ExportStatementRequest;
  filename?: string;
}

export async function exportFinancialStatement({ 
  json, 
  filename 
}: ExportStatementOptions) {
  const response = await (client as any)["financial-reports"]["export-statement"].$post({
    json,
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
    : `financial-statement-${new Date().toISOString().split('T')[0]}.${json.format || "pdf"}`;

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
