import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type GetExecutionsRequest = InferRequestType<
  (typeof client)["execution"]["$get"]
>["query"];

// Type inference for response data
export type GetExecutionsResponse = InferResponseType<
  (typeof client)["execution"]["$get"]
>;

export async function getExecutions(query: GetExecutionsRequest) {
  const response = await (client as any).execution.$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetExecutionsResponse;
}



