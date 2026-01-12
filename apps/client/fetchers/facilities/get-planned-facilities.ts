import { honoClient as client } from "@/api-client/index";

export interface PlannedFacility {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  projectId: number;
  projectType: string;
  plannedCount: number;
}

export interface GetPlannedFacilitiesResponse {
  data: PlannedFacility[];
}

async function getPlannedFacilities(): Promise<PlannedFacility[]> {
  const response = await (client as any).facilities.planned.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getPlannedFacilities;

