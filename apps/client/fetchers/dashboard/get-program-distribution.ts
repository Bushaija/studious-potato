export interface GetProgramDistributionRequest {
  level: 'province' | 'district';
  provinceId?: string | number;
  districtId?: string | number;
  quarter?: string | number;
}

export interface ProgramDistributionItem {
  programId: number;
  programName: string;
  allocatedBudget: number;
  percentage: number;
}

export interface ProgramDistributionResponse {
  programs: ProgramDistributionItem[];
  total: number;
}

/**
 * Fetch program budget distribution data
 * 
 * Returns budget allocation breakdown by health program (Malaria, HIV, TB, etc.)
 * with percentage of total for pie chart visualization.
 * 
 * @param params - Request parameters
 * @returns Program distribution data
 */
async function getProgramDistribution(params: GetProgramDistributionRequest): Promise<ProgramDistributionResponse> {
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

  if (params.quarter) {
    queryParams.append('quarter', params.quarter.toString());
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/program-distribution?${queryParams.toString()}`;

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

export default getProgramDistribution;
