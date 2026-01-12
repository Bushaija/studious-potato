import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type DafApproveResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["daf-approve"]["$post"]
>;

/**
 * Approve a financial report as DAF with hierarchy validation
 * Requirements: 3.1-3.5, 6.5, 5.2, 5.3
 * 
 * This method allows DAF users to approve reports from facilities within their hierarchy:
 * - Validates that the approver is a DAF user at the correct hospital
 * - Validates that the report's facility is within the approver's hierarchy
 * - Routes the approved report to DG users at the same hospital
 * 
 * Returns 403 Forbidden if the user doesn't have permission to approve the report.
 * 
 * @param reportId - The financial report ID to approve
 * @param comment - Optional approval comment
 * @returns The updated report with new status and workflow log
 */
export async function dafApprove(reportId: number, comment?: string) {
  const response = await client["financial-reports"][":id"]["daf-approve"].$post({
    param: { id: reportId.toString() },
    json: { comment },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as DafApproveResponse;
}
