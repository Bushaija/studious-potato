import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

export type GetFacilitiesByDistrictRequest = InferRequestType<
  (typeof client)["facilities"]["by-district"]["$get"]
>["query"];

export type GetFacilitiesByDistrictResponse = InferResponseType<
  (typeof client)["facilities"]["by-district"]["$get"]
>;

async function getFacilitiesByDistrict({ districtId }: GetFacilitiesByDistrictRequest) {
  const response = await client.facilities["by-district"].$get({
    query: { districtId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getFacilitiesByDistrict;

