import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type GetExecutionDocumentsResponse = InferResponseType<
  (typeof client)["documents"]["execution-entry"][":executionEntryId"]["$get"]
>;

export async function getExecutionDocuments(executionEntryId: number) {
  const response = await (client as any).documents["execution-entry"][executionEntryId].$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetExecutionDocumentsResponse;
}
