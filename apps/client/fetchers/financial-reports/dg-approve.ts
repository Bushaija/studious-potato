import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type DgApproveResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["dg-approve"]["$post"]
>;

/**
 * Approve a financial report as DG with hierarchy validation
 * Requirements: 3.1-3.5, 6.5, 5.3
 * 
 * This method allows DG users to provide final approval for reports:
 * - Validates that the approver is a DG user at the correct hospital
 * - Validates that the report's facility is within the approver's hierarchy
 * - Validates that the report has already been approved by DAF
 * - Marks the report as fully approved and generates the final PDF
 * 
 * Returns 403 Forbidden if the user doesn't have permission to approve the report.
 * 
 * @param reportId - The financial report ID to approve
 * @param comment - Optional approval comment
 * @returns The updated report with final approval status and PDF
 */
export async function dgApprove(reportId: number, comment?: string) {
  const response = await client["financial-reports"][":id"]["dg-approve"].$post({
    param: { id: reportId.toString() },
    json: { comment },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as DgApproveResponse;
}
