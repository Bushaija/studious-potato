import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type GetFacilityByNameRequest = InferRequestType<
  (typeof client)["facilities"]["by-name"]["$get"]
>["query"];

export type GetFacilityByNameResponse = InferResponseType<
  (typeof client)["facilities"]["by-name"]["$get"]
>;

async function getFacilityByName({ facilityName }: GetFacilityByNameRequest) {
  const response = await client.facilities["by-name"].$get({
    query: { facilityName },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getFacilityByName;

