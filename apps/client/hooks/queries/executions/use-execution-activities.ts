import { useQuery } from "@tanstack/react-query";
import { getExecutionActivities } from "@/fetchers/execution/get-execution-activities";

interface UseExecutionActivitiesParams {
  projectType?: "HIV" | "MAL" | "TB" | "Malaria"; // Accept both MAL and Malaria for backward compatibility
  facilityType?: "hospital" | "health_center";
  enabled?: boolean;
}

export function useExecutionActivities({
  projectType,
  facilityType,
  enabled = true,
}: UseExecutionActivitiesParams) {
  return useQuery({
    queryKey: [
      "execution",
      "activities",
      projectType ?? "all",
      facilityType ?? "all",
    ],
    queryFn: async () => {
      const data = await getExecutionActivities({ projectType, facilityType });
      return data;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}


