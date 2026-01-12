import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request body (json)
export type CreateExecutionRequest = InferRequestType<
  (typeof client)["execution"]["$post"]
>["json"];

/**
 * Enhanced execution response type with quarterly rollover information
 * 
 * This type is automatically inferred from the backend and includes:
 * - entry: The created execution data entry
 * - ui: UI structure data (optional)
 * - previousQuarterBalances: Closing balances from previous quarter (if Q2, Q3, or Q4)
 * - quarterSequence: Quarter navigation metadata
 * 
 * Requirements: 2.1-2.8, 3.1-3.7, 5.2, 6.2
 */
export type CreateExecutionResponse = InferResponseType<
  (typeof client)["execution"]["$post"]
>;

/**
 * Creates new execution data with enhanced quarterly rollover information
 * 
 * @param json - The execution data to create
 * @returns Enhanced execution response with previous quarter balances and quarter sequence
 */
export async function createExecution(json: CreateExecutionRequest) {
  const response = await (client as any).execution.$post({
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as CreateExecutionResponse;
}



