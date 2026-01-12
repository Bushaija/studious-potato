import { useQuery } from "@tanstack/react-query";
import { getPlanningActivities } from "@/fetchers/planning/get-planning-activitities";

interface UsePlanningActivitiesParams {
    projectType: 'HIV' | 'Malaria' | 'TB';
    facilityType: 'hospital' | 'health_center';
    enabled?: boolean;
};

export function usePlanningActivities ({
    projectType,
    facilityType,
    enabled = true
}: UsePlanningActivitiesParams) {
    return useQuery({
        queryKey: ["planning", "activities", projectType, facilityType],
        queryFn: () => getPlanningActivities({ projectType, facilityType }),
        enabled: enabled && !!projectType && !!facilityType,
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 3
    })
};