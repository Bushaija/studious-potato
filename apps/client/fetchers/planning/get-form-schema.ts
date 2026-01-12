import { honoClient as client, handleHonoResponse } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type GetPlanningFormSchemaRequest = InferRequestType<
  (typeof client)["planning"]["schema"]["$get"]
>["query"];

export type GetPlanningFormSchemaResponse = InferResponseType<
  (typeof client)["planning"]["schema"]["$get"]
>;

async function getPlanningFormSchema(query: GetPlanningFormSchemaRequest) {
  const respPromise = (client as any).planning.schema.$get({ query });
  return handleHonoResponse<GetPlanningFormSchemaResponse>(respPromise);
}

export default getPlanningFormSchema;



