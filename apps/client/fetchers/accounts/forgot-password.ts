import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type ForgotPasswordRequest = InferRequestType<
  (typeof client)["accounts"]["forgot-password"]["$post"]
>["json"];

// Type inference for response data
export type ForgotPasswordResponse = InferResponseType<
  (typeof client)["accounts"]["forgot-password"]["$post"]
>;

async function forgotPassword({ email }: ForgotPasswordRequest) {
  console.log('[FORGOT-PASSWORD-FETCHER] Starting request for email:', email);
  console.log('[FORGOT-PASSWORD-FETCHER] API endpoint:', 'http://localhost:9999/api/accounts/forgot-password');
  
  try {
    const response = await client.accounts["forgot-password"].$post({
      json: {
        email,
      },
    });

    console.log('[FORGOT-PASSWORD-FETCHER] Response status:', response.status);
    console.log('[FORGOT-PASSWORD-FETCHER] Response ok:', response.ok);

    if (!response.ok) {
      const error = await response.text();
      console.error('[FORGOT-PASSWORD-FETCHER] Error response:', error);
      throw new Error(error);
    }

    const data = await response.json();
    console.log('[FORGOT-PASSWORD-FETCHER] Success response:', data);
    return data;
  } catch (error) {
    console.error('[FORGOT-PASSWORD-FETCHER] Request failed:', error);
    throw error;
  }
}

export default forgotPassword;
