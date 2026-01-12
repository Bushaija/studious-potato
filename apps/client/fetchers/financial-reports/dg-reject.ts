import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type DgRejectResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["dg-reject"]["$post"]
>;

/**
 * Reject a financial report as DG with hierarchy validation
 * Requirements: 3.1-3.5, 6.5
 * 
 * This method allows DG users to reject reports from facilities within their hierarchy:
 * - Validates that the rejector is a DG user at the correct hospital
 * - Validates that the report's facility is within the rejector's hierarchy
 * - Routes the rejected report back to the original accountant at the source facility
 * - Requires a rejection comment explaining the reason
 * 
 * Returns 403 Forbidden if the user doesn't have permission to reject the report.
 * 
 * @param reportId - The financial report ID to reject
 * @param comment - Required rejection comment explaining the reason
 * @returns The updated report with rejection status and workflow log
 */
export async function dgReject(reportId: number, comment: string) {
  const response = await client["financial-reports"][":id"]["dg-reject"].$post({
    param: { id: reportId.toString() },
    json: { comment },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as DgRejectResponse;
}
