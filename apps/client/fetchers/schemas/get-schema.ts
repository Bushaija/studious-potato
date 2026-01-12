import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetSchemaRequest = InferRequestType<
  (typeof client)["schemas"][":id"]["$get"]
>["param"];

// Type inference for response data
export type GetSchemaResponse = InferResponseType<
  (typeof client)["schemas"][":id"]["$get"]
>;

async function getSchema({ id }: GetSchemaRequest) {
  const response = await client.schemas[":id"].$get({
    param: { id: id.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getSchema;



