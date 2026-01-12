import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type VerifyEmailRequest = InferRequestType<
  (typeof client)["accounts"]["verify-email"]["$post"]
>["json"];

// Type inference for response data
export type VerifyEmailResponse = InferResponseType<
  (typeof client)["accounts"]["verify-email"]["$post"]
>;

async function verifyEmail({ email, otp }: VerifyEmailRequest) {
  const response = await client.accounts["verify-email"].$post({
    json: {
      email,
      otp,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default verifyEmail;
