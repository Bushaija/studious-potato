import { useQuery } from "@tanstack/react-query";
import getPlanningActivities, { type GetPlanningActivitiesResponse } from "@/fetchers/planning/get-planning-activities";

interface GetPlanningActivitiesParams {
  page?: number;
  limit?: number;
  projectType?: string;
  facilityType?: string;
  facilityName?: string;
  search?: string;
  reportingPeriodId?: number;
  // New filters aligned with server
  reportingPeriod?: string; // e.g., "2024"
  categoryId?: string;
  year?: string;
  districtId?: string; // District filtering for admin users
}

function useGetPlanningActivities(params: GetPlanningActivitiesParams = {}) {
  return useQuery<GetPlanningActivitiesResponse>({
    queryFn: () => getPlanningActivities(params),
    // Include all params in the key so changes trigger refetch
    queryKey: [
      "planning-activities",
      {
        page: params.page,
        limit: params.limit,
        projectType: params.projectType,
        facilityType: params.facilityType,
        facilityName: params.facilityName,
        search: params.search,
        reportingPeriodId: params.reportingPeriodId,
        reportingPeriod: params.reportingPeriod,
        categoryId: params.categoryId,
        year: params.year,
        districtId: params.districtId,
      },
    ],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default useGetPlanningActivities;