import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetFinancialReportByIdRequest = InferRequestType<
  (typeof client)["financial-reports"][":id"]["$get"]
>["param"];

// Type inference for response data
export type GetFinancialReportByIdResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["$get"]
>;

/**
 * Fetch a single financial report by ID with hierarchy access validation
 * Requirements: 2.1-2.4, 4.1-4.3
 * 
 * This method validates that the user has access to the report's facility before returning it.
 * Access is determined by the facility hierarchy:
 * - Hospital users (DAF/DG): Can access reports from their facility and child health centers
 * - Health center users: Can only access reports from their own facility
 * - Admin users: Can access all reports
 * 
 * Returns 403 Forbidden if the user doesn't have access to the report's facility.
 * 
 * @param id - The financial report ID
 * @returns The financial report with facility hierarchy information
 */
export async function getFinancialReportById(id: number | string) {
  const response = await (client as any)["financial-reports"][":id"].$get({
    param: { id: id.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetFinancialReportByIdResponse;
}
