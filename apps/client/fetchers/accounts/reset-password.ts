import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type ResetPasswordRequest = InferRequestType<
  (typeof client)["accounts"]["reset-password"]["$post"]
>["json"];

// Type inference for response data
export type ResetPasswordResponse = InferResponseType<
  (typeof client)["accounts"]["reset-password"]["$post"]
>;

async function resetPassword({
  email,
  newPassword,
}: ResetPasswordRequest) {
  const response = await client.accounts["reset-password"].$post({
    json: {
      email,
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

export default resetPassword;
