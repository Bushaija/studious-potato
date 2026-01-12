import { honoClient as client } from "@/api-client/index";

export interface GetFacilityByIdRequest {
  id: number | string;
}

async function getFacilityById({ id }: GetFacilityByIdRequest) {
  const response = await (client as any).facilities[":id"].$get({
    param: { id: String(id) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getFacilityById;

