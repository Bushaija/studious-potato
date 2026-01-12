import { honoClient as client } from "@/api-client/index";
import { normalizeFormData } from "./utils";
// import type { InferRequestType, InferResponseType } from "hono/client";

// // Type inference for request payload
// export type ValidatePlanningRequest = InferRequestType<
//   (typeof client)["planning"]["validate"]["$post"]
// >["json"];

// // Type inference for response data
// export type ValidatePlanningResponse = InferResponseType<
//   (typeof client)["planning"]["validate"]["$post"]
// >;

// async function validatePlanning({
//   schemaId,
//   data,
//   context,
// }: ValidatePlanningRequest) {
//   const response = await client.planning.validate.$post({
//     json: {
//       schemaId,
//       data,
//       context,
//     },
//   });

//   if (!response.ok) {
//     const error = await response.text();
//     throw new Error(error);
//   }

//   const result = await response.json();
//   return result;
// }

// export default validatePlanning;

export async function validatePlanning(data: {
  schemaId: number,
  data: Record<string, any>,
  context?: any
}) {
  const response = await (client.planning as any)['validate'].$post({
    json: {
      ...data,
      data: normalizeFormData(data.data)
    }
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'failed to validate planning data.')
  }

  return await response.json();
}
