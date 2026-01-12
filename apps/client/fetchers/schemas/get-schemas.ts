import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetSchemasRequest = InferRequestType<
  (typeof client)["schemas"]["$get"]
>["query"];

// Type inference for response data
export type GetSchemasResponse = InferResponseType<
  (typeof client)["schemas"]["$get"]
>;

async function getSchemas({
  projectType,
  facilityType,
  moduleType,
  isActive,
  page,
  limit,
}: GetSchemasRequest = {}) {
  const response = await client.schemas.$get({
    query: {
      projectType,
      facilityType,
      moduleType,
      isActive,
      page,
      limit,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getSchemas;



