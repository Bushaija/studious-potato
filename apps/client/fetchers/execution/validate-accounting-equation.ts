import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type ValidateAccountingEquationRequest = InferRequestType<
  (typeof client)["execution"]["validate-accounting-equation"]["$post"]
>["json"];

export type ValidateAccountingEquationResponse = InferResponseType<
  (typeof client)["execution"]["validate-accounting-equation"]["$post"]
>;

export async function validateAccountingEquation(json: ValidateAccountingEquationRequest) {
  const response = await (client as any).execution["validate-accounting-equation"].$post({
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as ValidateAccountingEquationResponse;
}



