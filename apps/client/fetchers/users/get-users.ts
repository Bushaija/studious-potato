import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetUsersRequest = InferRequestType<
  (typeof client)["admin"]["users"]["$get"]
>["query"];

// Type inference for response data
export type GetUsersResponse = InferResponseType<
  (typeof client)["admin"]["users"]["$get"]
>;

async function getUsers({
  page,
  limit,
  role,
  facilityId,
  isActive,
  search,
}: GetUsersRequest = {}) {
  const response = await client.admin.users.$get({
    query: {
      page,
      limit,
      role,
      facilityId,
      isActive,
      search,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getUsers;
