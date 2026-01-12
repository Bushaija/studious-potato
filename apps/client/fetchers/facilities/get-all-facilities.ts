import { honoClient as client, handleHonoResponse } from "@/api-client/index";

export type FacilityWithDistrict = {
  id: number;
  name: string;
  facilityType: "hospital" | "health_center";
  districtId: number;
  districtName: string;
};

async function getAllFacilities(): Promise<FacilityWithDistrict[]> {
  console.log("🚀 [getAllFacilities] API request");
  const response = await (client.facilities as any)["all"].$get();
  const result = await handleHonoResponse<FacilityWithDistrict[]>(response);
  console.log("📥 [getAllFacilities] API response:", result);
  return result;
}

export default getAllFacilities;
