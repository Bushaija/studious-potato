import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (param)
export type GetExecutionByIdRequest = InferRequestType<
  (typeof client)["execution"][":id"]["$get"]
>["param"];

/**
 * Enhanced execution response type with quarterly rollover information
 * 
 * This type is automatically inferred from the backend and includes:
 * - entry: The execution data entry
 * - ui: UI structure data (optional)
 * - previousQuarterBalances: Closing balances from previous quarter for Section D and E
 * - quarterSequence: Quarter navigation metadata (current, previous, next)
 * 
 * Requirements: 2.1-2.8, 3.1-3.7, 5.1
 */
export type GetExecutionByIdResponse = InferResponseType<
  (typeof client)["execution"][":id"]["$get"]
>;

/**
 * Fetches execution data by ID with enhanced quarterly rollover information
 * 
 * @param id - The execution ID to fetch
 * @returns Enhanced execution response with previous quarter balances and quarter sequence
 */
export async function getExecutionById({ id }: GetExecutionByIdRequest) {
  const response = await (client as any).execution[":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetExecutionByIdResponse;
}



