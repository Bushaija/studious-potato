import { honoClient as client } from "@/api-client/index";

export interface Province {
  id: number;
  name: string;
}

export async function getProvinces(): Promise<Province[]> {
  const response = await (client as any).provinces.$get();
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to fetch provinces');
  }
  
  const data = await response.json();
  return data as Province[];
}
