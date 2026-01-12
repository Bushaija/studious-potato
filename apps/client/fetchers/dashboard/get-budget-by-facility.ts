export interface GetBudgetByFacilityRequest {
  districtId?: string | number;
  facilityId?: string | number;
  projectType?: string;
  quarter?: string | number;
}

export interface FacilityBudgetItem {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

export interface BudgetByFacilityResponse {
  facilities: FacilityBudgetItem[];
}

/**
 * Fetch budget data aggregated by facility
 * 
 * Returns budget allocation and spending for all facilities within a district,
 * used for bar chart visualization on the District tab.
 * 
 * @param params - Request parameters
 * @returns Budget by facility data
 */
async function getBudgetByFacility(params: GetBudgetByFacilityRequest): Promise<BudgetByFacilityResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.districtId) {
    queryParams.append('districtId', params.districtId.toString());
  }

  if (params.facilityId) {
    queryParams.append('facilityId', params.facilityId.toString());
  }

  if (params.projectType) {
    queryParams.append('projectType', params.projectType);
  }

  if (params.quarter) {
    queryParams.append('quarter', params.quarter.toString());
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/budget-by-facility?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getBudgetByFacility;
