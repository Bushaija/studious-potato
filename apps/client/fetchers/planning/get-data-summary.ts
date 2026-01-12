import { honoClient as client } from "@/api-client/index";

export async function getPlanningDataSummary(params: {
    projectId: string;
    facilityId: string;
    reportingPeriodId?: string;
  }) {
    const response = await (client.planning as any)['summary'].$get({
      query: params
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch planning data summary');
    }
  
    return await response.json();
  }