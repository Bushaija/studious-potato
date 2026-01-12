import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type ForcePasswordChangeRequest = InferRequestType<
  (typeof client)["accounts"]["force-password-change"]["$post"]
>["json"];

// Type inference for response data
export type ForcePasswordChangeResponse = InferResponseType<
  (typeof client)["accounts"]["force-password-change"]["$post"]
>;

async function forcePasswordChange({
  currentPassword,
  newPassword,
}: ForcePasswordChangeRequest) {
  const response = await client.accounts["force-password-change"].$post({
    json: {
      currentPassword,
      newPassword,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default forcePasswordChange;
