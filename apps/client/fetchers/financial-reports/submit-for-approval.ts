import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type SubmitForApprovalResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["submit"]["$post"]
>;

/**
 * Submit a financial report for approval with hierarchy-aware routing
 * Requirements: 3.1-3.5, 6.5, 5.2, 5.3
 * 
 * This method submits a report for approval and automatically routes it to the appropriate approvers:
 * - Health center reports: Routed to DAF users at the parent hospital
 * - Hospital reports: Routed to DAF users at the same hospital
 * 
 * The routing respects district boundaries and only notifies approvers within the same district.
 * 
 * @param reportId - The financial report ID to submit
 * @returns The updated report with new status and workflow log
 */
export async function submitForApproval(reportId: number) {
  const response = await client["financial-reports"][":id"]["submit"].$post({
    param: { id: reportId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as SubmitForApprovalResponse;
}
