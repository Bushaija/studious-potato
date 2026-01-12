export interface GetMetricsRequest {
  level: 'province' | 'district';
  provinceId?: string | number;
  districtId?: string | number;
  projectType?: string;
  quarter?: string | number;
}

export interface MetricsResponse {
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationPercentage: number;
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
  } | null;
}

/**
 * Fetch dashboard metrics data
 * 
 * This is the new metrics endpoint that replaces the legacy facility-overview endpoint.
 * It provides aggregated budget metrics at province or district level.
 * 
 * @param params - Request parameters
 * @returns Dashboard metrics data
 */
async function getMetrics(params: GetMetricsRequest): Promise<MetricsResponse> {
  const queryParams = new URLSearchParams();
  
  queryParams.append('level', params.level);
  
  if (params.level === 'district') {
    if (!params.districtId) {
      throw new Error('districtId is required when level is "district"');
    }
    queryParams.append('districtId', params.districtId.toString());
  } else if (params.level === 'province') {
    if (!params.provinceId) {
      throw new Error('provinceId is required when level is "province"');
    }
    queryParams.append('provinceId', params.provinceId.toString());
  }

  if (params.projectType) {
    queryParams.append('projectType', params.projectType);
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

  const data = await response.json();
  return data;
}

export default getMetrics;
