import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type GetExecutionQuarterlySummaryRequest = InferRequestType<
  (typeof client)["execution"]["quarterly-summary"]["$get"]
>["query"];

// Type inference for response data
export type GetExecutionQuarterlySummaryResponse = InferResponseType<
  (typeof client)["execution"]["quarterly-summary"]["$get"]
>;

export async function getExecutionQuarterlySummary(
  query: GetExecutionQuarterlySummaryRequest
) {
  const response = await (client as any).execution["quarterly-summary"].$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetExecutionQuarterlySummaryResponse;
}



