import { honoClient as client } from "@/api-client/index";

export interface ExecutionFormSchema {
  id: number;
  name: string;
  version: string;
  schema: any;
  metadata: any;
}

export async function getExecutionFormSchema(params: {
  projectType?: "HIV" | "MAL" | "TB" | "Malaria";
  facilityType?: "hospital" | "health_center";
}) {
  // Convert MAL to Malaria for API compatibility
  const apiParams = {
    ...params,
    projectType: params.projectType === 'MAL' ? 'Malaria' : params.projectType
  };
  
  const response = await (client.execution as any)["schema"].$get({
    query: apiParams,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch execution form schema");
  }

  const json = await response.json();
  return json.data as ExecutionFormSchema;
}


