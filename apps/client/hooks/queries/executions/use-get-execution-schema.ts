import { useQuery } from "@tanstack/react-query";
import { getExecutionFormSchema } from "@/fetchers/execution/get-execution-schema";

interface UseGetExecutionSchemaParams {
  projectType?: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center";
  enabled?: boolean;
}

export function useGetExecutionSchema({
  projectType,
  facilityType,
  enabled = true,
}: UseGetExecutionSchemaParams) {
  return useQuery({
    queryKey: [
      "execution",
      "schema",
      projectType ?? "all",
      facilityType ?? "all",
    ],
    queryFn: () => getExecutionFormSchema({ projectType, facilityType }),
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}


