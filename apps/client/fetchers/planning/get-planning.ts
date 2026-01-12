import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetPlanningRequest = InferRequestType<
  (typeof client)["planning"]["$get"]
>["query"];

// Type inference for response data
export type GetPlanningResponse = InferResponseType<
  (typeof client)["planning"]["$get"]
>;

async function getPlanning({
  projectId,
  facilityId,
  reportingPeriodId,
  page,
  limit,
}: GetPlanningRequest = {}) {
  const response = await client.planning.$get({
    query: {
      projectId,
      facilityId,
      reportingPeriodId,
      page,
      limit,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getPlanning;



