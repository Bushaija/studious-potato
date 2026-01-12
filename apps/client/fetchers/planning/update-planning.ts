import { honoClient as client } from "@/api-client/index";
// import type { InferRequestType, InferResponseType } from "hono/client";

import { UpdatePlanningDataRequest } from "./types";
import { normalizeFormData } from "./utils";

// // Type inference for request parameters and payload
// export type UpdatePlanningRequest = InferRequestType<
//   (typeof client)["planning"][":id"]["$put"]
// >["param"] & InferRequestType<
//   (typeof client)["planning"][":id"]["$put"]
// >["json"];

// // Type inference for response data
// export type UpdatePlanningResponse = InferResponseType<
//   (typeof client)["planning"][":id"]["$put"]
// >;

// async function updatePlanning({
//   id,
//   schemaId,
//   projectId,
//   facilityId,
//   reportingPeriodId,
//   formData,
//   metadata,
// }: UpdatePlanningRequest) {
//   const response = await client.planning[":id"].$put({
//     param: { id: id.toString() },
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

// export default updatePlanning;

export async function updatePlanning(
  id: string | number, 
  data: UpdatePlanningDataRequest
) {
  // Normalize form data before sending
  const normalizedData = {
    ...data,
    formData: data.formData ? normalizeFormData(data.formData) : undefined
  };

  const response = await (client.planning as any)[":id"].$put({
    param: { id: String(id) },
    json: normalizedData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update planning data');
  }

  return await response.json();
}

