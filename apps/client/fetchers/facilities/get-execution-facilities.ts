import { honoClient as client, handleHonoResponse } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type GetExecutionFacilitiesRequest = InferRequestType<
  (typeof client)["facilities"]["execution"]["$get"]
>["query"];

export type GetExecutionFacilitiesResponse = InferResponseType<
  (typeof client)["facilities"]["execution"]["$get"]
>;

async function getExecutionFacilities(query: GetExecutionFacilitiesRequest) {
  console.log("🚀 [getExecutionFacilities] API request:", query);
  const response = await client.facilities.execution.$get({ 
    query: {
      program: query.program,
      facilityType: query.facilityType,
      facilityId: query.facilityId,
      ...(query.reportingPeriodId && { reportingPeriodId: query.reportingPeriodId }),
      ...(query.quarter && { quarter: query.quarter }),
    }
  });
  const result = await handleHonoResponse<GetExecutionFacilitiesResponse>(response);
  console.log("📥 [getExecutionFacilities] API response:", result);
  return result;
}

export default getExecutionFacilities;