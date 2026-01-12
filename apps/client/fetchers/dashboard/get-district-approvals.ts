export interface GetDistrictApprovalsRequest {
  districtId?: string | number;
  facilityId?: string | number;
  projectType?: string;
  quarter?: string | number;
}

export interface DistrictApprovalItem {
  facilityId: number;
  facilityName: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  allocatedBudget: number;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy: string | null;
  approvedAt: string | null;
  quarter: number | null;
}

export interface DistrictApprovalResponse {
  facilities: DistrictApprovalItem[];
}

/**
 * Fetch district-level approval details data
 * 
 * Returns detailed approval information for all facilities within a district,
 * including approval status, approver, and timestamp for each budget plan.
 * Used for the approval details table on the District tab.
 * 
 * @param params - Request parameters
 * @returns District approval details data
 */
async function getDistrictApprovals(params: GetDistrictApprovalsRequest): Promise<DistrictApprovalResponse> {
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

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/approved-budgets/district?${queryParams.toString()}`;

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

export default getDistrictApprovals;
