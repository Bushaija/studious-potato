import { honoClient as client, handleHonoResponse } from "@/api-client/index";

export type FacilityHierarchyData = {
  facility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
    districtName: string;
    parentFacilityId: number | null;
  };
  parentFacility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  } | null;
  childFacilities: Array<{
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  }>;
};

async function getFacilityHierarchy(facilityId: number): Promise<FacilityHierarchyData> {
  console.log("🚀 [getFacilityHierarchy] API request for facility:", facilityId);
  const response = await (client as any).facilities[":id"].hierarchy.$get({
    param: { id: String(facilityId) },
  });
  const result = await handleHonoResponse<FacilityHierarchyData>(response);
  console.log("📥 [getFacilityHierarchy] API response:", result);
  return result;
}

export default getFacilityHierarchy;
