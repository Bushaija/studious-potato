import { honoClient as client } from "@/api-client/index";
// import type { InferRequestType, InferResponseType } from "hono/client";

import { CreatePlanningDataRequest } from "./types";
import { normalize } from "path";
import { UpdatePlanningDataRequest } from "./planning-api";
import { normalizeFormData } from "./utils";

// // Type inference for request payload
// export type CreatePlanningRequest = InferRequestType<
//   (typeof client)["planning"]["$post"]
// >["json"];

// // Type inference for response data
// export type CreatePlanningResponse = InferResponseType<
//   (typeof client)["planning"]["$post"]
// >;

// async function createPlanning({
//   schemaId,
//   projectId,
//   facilityId,
//   reportingPeriodId,
//   formData,
//   metadata,
// }: CreatePlanningRequest) {
//   const response = await client.planning.$post({
//     json: {
//       schemaId,
//       projectId,
//       facilityId,
//       reportingPeriodId,
//       formData,
//       metadata,
//     },
//   });

//   if (!response.ok) {
//     const error = await response.text();
//     throw new Error(error);
//   }

//   const data = await response.json();
//   return data;
// }

// export default createPlanning;

export async function createPlanning(data: CreatePlanningDataRequest) {
  const normalizedData = {
    ...data,
    formData: normalizeFormData(data.formData)
  };

  // Debug: Log the reportingPeriodId being sent
  console.log('🚀 [createPlanning] reportingPeriodId being sent:', normalizedData.reportingPeriodId);

  const response = await client.planning.$post({
    json: normalizedData
  });

  if (!response.ok) {
    const error = await response.json as { message?: string };
    throw new Error(error.message || 'failed to create planning data');
  }

  return await response.json();
}

export async function updatePlanning (
  id: string | number,
  data: UpdatePlanningDataRequest
) {
  const normalizedData = {
    ...data,
    formData: data.formData ? normalizeFormData(data.formData) : undefined,
  };

  const response = await (client.planning as any)[":id"].$put({
    param: { id: String(id) },
    json: normalizedData
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'failed to update planning data');
  }

  return await response.json();
}

