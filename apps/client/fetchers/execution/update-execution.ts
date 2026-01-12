import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters and body
export type UpdateExecutionParam = InferRequestType<
  (typeof client)["execution"][":id"]["$put"]
>["param"];

export type UpdateExecutionRequest = InferRequestType<
  (typeof client)["execution"][":id"]["$put"]
>["json"];

/**
 * Enhanced execution response type with quarterly rollover information
 * 
 * This type is automatically inferred from the backend and includes:
 * - entry: The updated execution data entry
 * - ui: UI structure data (optional)
 * - previousQuarterBalances: Closing balances from previous quarter
 * - quarterSequence: Quarter navigation metadata
 * - cascadeImpact: Information about affected subsequent quarters (optional)
 * 
 * Note: The cascadeImpact field indicates which quarters were affected by this update
 * and whether they were recalculated immediately or queued for background processing.
 * 
 * Requirements: 2.1-2.8, 3.1-3.7, 5.2, 6.3, 8.5
 */
export type UpdateExecutionResponse = InferResponseType<
  (typeof client)["execution"][":id"]["$put"]
>;

/**
 * Updates execution data with enhanced quarterly rollover information
 * 
 * Note: Updating a quarter may affect subsequent quarters' opening balances,
 * triggering cascade recalculation.
 * 
 * @param id - The execution ID to update
 * @param json - The execution data updates
 * @returns Enhanced execution response with previous quarter balances, quarter sequence, and cascade impact
 */
export async function updateExecution(
  { id }: UpdateExecutionParam,
  json: UpdateExecutionRequest
) {
  const response = await (client as any).execution[":id"].$put({
    param: { id },
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as UpdateExecutionResponse;
}


