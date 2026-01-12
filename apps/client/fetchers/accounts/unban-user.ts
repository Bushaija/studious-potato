import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type UnbanUserRequest = InferRequestType<
  (typeof client)["accounts"]["unban-user"]["$post"]
>["json"];

// Type inference for response data
export type UnbanUserResponse = InferResponseType<
  (typeof client)["accounts"]["unban-user"]["$post"]
>;

async function unbanUser({
  userId,
  reason,
}: UnbanUserRequest) {
  const response = await client.accounts["unban-user"].$post({
    json: {
      userId,
      reason,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default unbanUser;
