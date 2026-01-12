import { honoClient as client, handleHonoResponse } from "@/api-client/index";

export type AccessibleFacility = {
  id: number;
  name: string;
  facilityType: "hospital" | "health_center";
  districtId: number;
  districtName: string;
  parentFacilityId: number | null;
};

async function getAccessibleFacilities(): Promise<AccessibleFacility[]> {
  console.log("🚀 [getAccessibleFacilities] API request");
  const response = await client.facilities.accessible.$get();
  const result = await handleHonoResponse<AccessibleFacility[]>(response);
  console.log("📥 [getAccessibleFacilities] API response:", result);
  return result;
}

export default getAccessibleFacilities;
