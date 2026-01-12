import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type DeleteExecutionRequest = InferRequestType<
  (typeof client)["execution"][":id"]["$delete"]
>["param"];

export type DeleteExecutionResponse = InferResponseType<
  (typeof client)["execution"][":id"]["$delete"]
>;

export async function deleteExecution({ id }: DeleteExecutionRequest) {
  const response = await (client as any).execution[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json().catch(() => undefined);
  return data as DeleteExecutionResponse;
}



