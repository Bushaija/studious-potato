import { honoClient as client, handleHonoResponse } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type GetPlanningFacilitiesRequest = InferRequestType<
  (typeof client)["facilities"]["planned"]["$get"]
>["query"];

export type GetPlanningFacilitiesResponse = InferResponseType<
  (typeof client)["facilities"]["planned"]["$get"]
>;

async function getPlanningFacilities(query: GetPlanningFacilitiesRequest) {
  console.log("🚀 [getPlanningFacilities] API request:", query);
  const response = await client.facilities.planned.$get({ 
    query: {
      program: query.program,
      facilityType: query.facilityType,
      facilityId: query.facilityId,
      ...(query.reportingPeriodId && { reportingPeriodId: query.reportingPeriodId }),
    }
  });
  const result = await handleHonoResponse<GetPlanningFacilitiesResponse>(response);
  console.log("📥 [getPlanningFacilities] API response:", result);
  return result;
}

export default getPlanningFacilities;