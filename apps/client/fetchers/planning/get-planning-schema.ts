import { honoClient as client } from "@/api-client/index";


export async function getPlanningSchema(params: {
    projectType: 'HIV' | 'Malaria' | 'TB';
    facilityType: 'hospital' | 'health_center';
  }) {
    const response = await (client.planning as any)['schema'].$get({
      query: params
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch planning schema');
    }
  
    return await response.json();
  }