import { honoClient as client } from "@/api-client/index";

export interface ExecutionActivity {
  id: number;
  name: string;
  code: string;
  activityType: string;
  displayOrder: number;
  isAnnualOnly: boolean;
  isTotalRow: boolean;
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  categoryDisplayOrder: number;
  // Optional fields present in API but previously untyped
  fieldMappings?: { category?: string; subcategory?: string };
  metadata?: Record<string, any> | null;
}

export async function getExecutionActivities(params: {
  projectType?: "HIV" | "MAL" | "TB" | "Malaria";
  facilityType?: "hospital" | "health_center";
}) {
  // Convert MAL to Malaria for API compatibility
  const apiParams = {
    ...params,
    projectType: params.projectType === 'MAL' ? 'Malaria' : params.projectType
  };
  
  const response = await (client.execution as any)["activities"].$get({
    query: apiParams,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch execution activities");
  }

  const json = await response.json();
  return json.data as ExecutionActivity[];
}


