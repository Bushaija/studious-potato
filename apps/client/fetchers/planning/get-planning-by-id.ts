import { honoClient as client } from "@/api-client/index";
// import type { InferRequestType, InferResponseType } from "hono/client";

// // Type inference for request parameters
// export type GetPlanningByIdRequest = InferRequestType<
//   (typeof client)["planning"][":id"]["$get"]
// >["param"];

// // Type inference for response data
// export type GetPlanningByIdResponse = InferResponseType<
//   (typeof client)["planning"][":id"]["$get"]
// >;

// async function getPlanningById({ id }: GetPlanningByIdRequest) {
//   const response = await client.planning[":id"].$get({
//     param: { id: id.toString() },
//   });

//   if (!response.ok) {
//     const error = await response.text();
//     throw new Error(error);
//   }

//   const data = await response.json();
//   return data;
// }

// export default getPlanningById;


export async function getPlanningById(id: string | number) {
  const response = await (client.planning as any)[":id"].$get({
    param: { id: String(id)}
  });
  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'failed to fetch planning data');
  }

  return response.json();
}
