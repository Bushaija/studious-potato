import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type GetWorkflowLogsResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["workflow-logs"]["$get"]
>;

export async function getWorkflowLogs(reportId: number) {
  const response = await client["financial-reports"][":id"]["workflow-logs"].$get({
    param: { id: reportId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetWorkflowLogsResponse;
}
