export interface GetProvinceApprovalsRequest {
  provinceId: string | number;
  projectType?: string;
  quarter?: string | number;
}

export interface ProvinceApprovalItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCount: number;
  approvalRate: number;
}

export interface ProvinceApprovalResponse {
  districts: ProvinceApprovalItem[];
}

/**
 * Fetch province-level approval summary data
 * 
 * Returns approval status summary for all districts within a province,
 * showing counts of approved, rejected, and pending budget plans.
 * Used for the approval summary table on the Province tab.
 * 
 * @param params - Request parameters
 * @returns Province approval summary data
 */
async function getProvinceApprovals(params: GetProvinceApprovalsRequest): Promise<ProvinceApprovalResponse> {
  const queryParams = new URLSearchParams();
  
  queryParams.append('provinceId', params.provinceId.toString());

  if (params.projectType) {
    queryParams.append('projectType', params.projectType);
  }

  if (params.quarter) {
    queryParams.append('quarter', params.quarter.toString());
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/approved-budgets/province?${queryParams.toString()}`;

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

export default getProvinceApprovals;
