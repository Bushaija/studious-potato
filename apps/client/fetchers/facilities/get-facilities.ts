import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type GetFacilitiesResponse = InferResponseType<
  (typeof client)["facilities"]["$get"]
>;

async function getFacilities() {
  const response = await client.facilities.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getFacilities;

