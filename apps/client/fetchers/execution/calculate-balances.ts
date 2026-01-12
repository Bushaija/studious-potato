import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type CalculateBalancesRequest = InferRequestType<
  (typeof client)["execution"]["calculate-balances"]["$post"]
>["json"];

export type CalculateBalancesResponse = InferResponseType<
  (typeof client)["execution"]["calculate-balances"]["$post"]
>;

export async function calculateExecutionBalances(json: CalculateBalancesRequest) {
  const response = await (client as any).execution["calculate-balances"].$post({
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as CalculateBalancesResponse;
};



