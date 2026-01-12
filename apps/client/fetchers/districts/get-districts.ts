import { honoClient as client } from "@/api-client/index";

export interface District {
  id: number;
  name: string;
  provinceId: number;
}

export interface GetDistrictsRequest {
  provinceId?: number;
}

export async function getDistricts(params?: GetDistrictsRequest): Promise<District[]> {
  const response = await (client as any).districts.$get({
    query: params as any
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to fetch districts');
  }
  
  const data = await response.json();
  return data as District[];
}
