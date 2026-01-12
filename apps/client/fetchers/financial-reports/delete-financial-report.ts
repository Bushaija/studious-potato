import { honoClient as client } from "@/api-client/index";
import type { InferRequestType } from "hono/client";

// Type inference for request parameters
export type DeleteFinancialReportRequest = InferRequestType<
  (typeof client)["financial-reports"][":id"]["$delete"]
>["param"];

/**
 * Delete a financial report with hierarchy access validation
 * Requirements: 2.1-2.4, 4.1-4.5
 * 
 * This method validates that the user has permission to delete the report based on:
 * - Facility hierarchy access (user must have access to the report's facility)
 * - Role-based permissions (typically only accountants can delete their own facility's reports)
 * 
 * Returns 403 Forbidden if the user doesn't have access to delete the report.
 * 
 * @param id - The financial report ID to delete
 * @returns Success confirmation
 */
export async function deleteFinancialReport(id: number | string) {
  const response = await (client as any)["financial-reports"][":id"].$delete({
    param: { id: id.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return { success: true };
}
