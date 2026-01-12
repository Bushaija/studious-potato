import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type BanUserRequest = InferRequestType<
  (typeof client)["accounts"]["ban-user"]["$post"]
>["json"];

// Type inference for response data
export type BanUserResponse = InferResponseType<
  (typeof client)["accounts"]["ban-user"]["$post"]
>;

async function banUser({
  userId,
  banReason,
  banExpiresIn,
  banExpiresAt,
}: BanUserRequest) {
  const response = await client.accounts["ban-user"].$post({
    json: {
      userId,
      banReason,
      banExpiresIn,
      banExpiresAt,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default banUser;
