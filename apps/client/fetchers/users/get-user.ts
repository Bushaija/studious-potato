import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetUserRequest = InferRequestType<
  (typeof client)["admin"]["users"][":userId"]["$get"]
>["param"];

// Type inference for response data
export type GetUserResponse = InferResponseType<
  (typeof client)["admin"]["users"][":userId"]["$get"]
>;

async function getUser({ userId }: GetUserRequest) {
  const response = await client.admin.users[":userId"].$get({
    param: { userId: userId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getUser;
