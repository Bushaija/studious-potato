import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type GetFinancialReportsRequest = InferRequestType<
  (typeof client)["financial-reports"]["$get"]
>["query"];

// Type inference for response data
export type GetFinancialReportsResponse = InferResponseType<
  (typeof client)["financial-reports"]["$get"]
>;

/**
 * Fetch financial reports with hierarchy-aware filtering
 * Requirements: 2.1-2.4, 4.1-4.3
 * 
 * This method automatically filters reports based on the user's facility hierarchy:
 * - Hospital users (DAF/DG): Returns reports from their facility and all child health centers
 * - Health center users: Returns only reports from their own facility
 * - Admin users: Returns all reports
 * 
 * The filtering is handled server-side by the facility hierarchy middleware.
 * 
 * @param query - Query parameters for filtering reports (status, facilityId, etc.)
 * @returns Paginated list of financial reports accessible to the user
 */
export async function getFinancialReports(query: GetFinancialReportsRequest) {
  const response = await (client as any)["financial-reports"].$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetFinancialReportsResponse;
}
