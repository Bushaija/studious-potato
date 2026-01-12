import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request body
export type GenerateStatementRequest = InferRequestType<
  (typeof client)["financial-reports"]["generate-statement"]["$post"]
>["json"];

// Type inference for response data
export type GenerateStatementResponse = InferResponseType<
  (typeof client)["financial-reports"]["generate-statement"]["$post"]
>;

export async function generateFinancialStatement(json: GenerateStatementRequest) {
  try {
    const response = await (client as any)["financial-reports"]["generate-statement"].$post({
      json,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Keep the default error message
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as GenerateStatementResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate financial statement');
  }
}
