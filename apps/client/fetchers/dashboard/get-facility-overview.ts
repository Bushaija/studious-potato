// Legacy interface - maintained for backward compatibility
export interface GetFacilityOverviewRequest {
  facilityId?: string | number;
  // New parameters for metrics endpoint
  level?: 'province' | 'district';
  districtId?: string | number;
  provinceId?: string | number;
  programId?: string | number;
  quarter?: string | number;
}

export interface FacilityOverviewResponse {
  currentReportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  facility: {
    id: number;
    name: string;
    facilityType: string;
  };
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    utilizationPercentage: number;
  };
  projectBreakdown: Array<{
    projectId: number;
    projectName: string;
    projectCode: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
  }>;
}

/**
 * Fetch facility overview data
 * 
 * @deprecated The facilityId parameter is deprecated. Use level, districtId, or provinceId instead.
 * This function will continue to work with facilityId for backward compatibility,
 * but new code should use the new parameters.
 * 
 * @param params - Request parameters
 * @returns Facility overview data
 */
async function getFacilityOverview(params: GetFacilityOverviewRequest = {}): Promise<FacilityOverviewResponse> {
  const queryParams = new URLSearchParams();
  
  // Support legacy facilityId parameter (calls old endpoint)
  if (params.facilityId && !params.level) {
    queryParams.append('facilityId', params.facilityId.toString());

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/accountant/facility-overview${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

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

  // Use new metrics endpoint when level is specified
  if (params.level) {
    if (params.level === 'district' && params.districtId) {
      queryParams.append('level', 'district');
      queryParams.append('districtId', params.districtId.toString());
    } else if (params.level === 'province' && params.provinceId) {
      queryParams.append('level', 'province');
      queryParams.append('provinceId', params.provinceId.toString());
    } else {
      throw new Error('Invalid parameters: level requires corresponding districtId or provinceId');
    }

    if (params.programId) {
      queryParams.append('programId', params.programId.toString());
    }

    if (params.quarter) {
      queryParams.append('quarter', params.quarter.toString());
    }

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/metrics?${queryParams.toString()}`;

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

    const metricsData = await response.json();
    
    // Transform new metrics response to match legacy format
    return {
      currentReportingPeriod: metricsData.reportingPeriod,
      facility: {
        id: 0, // Not available in metrics endpoint
        name: params.level === 'district' ? 'District View' : 'Province View',
        facilityType: params.level,
      },
      budgetSummary: {
        totalAllocated: metricsData.totalAllocated,
        totalSpent: metricsData.totalSpent,
        totalRemaining: metricsData.remaining,
        utilizationPercentage: metricsData.utilizationPercentage,
      },
      projectBreakdown: [], // Not available in metrics endpoint
    };
  }

  // Default: call legacy endpoint without parameters
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/accountant/facility-overview`;

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

export default getFacilityOverview;
