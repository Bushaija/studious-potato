import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type CheckExistingExecutionRequest = InferRequestType<
  (typeof client)["execution"]["check-existing"]["$get"]
>["query"];

// Type inference for response data
export type CheckExistingExecutionResponse = InferResponseType<
  (typeof client)["execution"]["check-existing"]["$get"]
>;

export async function checkExistingExecution(query: CheckExistingExecutionRequest) {
  const response = await (client as any).execution["check-existing"].$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as CheckExistingExecutionResponse;
}
