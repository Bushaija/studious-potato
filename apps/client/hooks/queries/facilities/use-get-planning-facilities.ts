import getPlanningFacilities, {
    type GetPlanningFacilitiesResponse,
  } from "@/fetchers/facilities/get-planning-facilities";
  import { useQuery } from "@tanstack/react-query";
  
  interface UseGetPlanningFacilitiesParams {
    program: string;
    facilityType: string;
    facilityId: number | string;
    reportingPeriodId?: number | string;
  }
  
  export function useGetPlanningFacilities(params: UseGetPlanningFacilitiesParams) {
    const { program, facilityType, facilityId, reportingPeriodId } = params;
    
    // Convert IDs to strings for the query
    const facilityIdStr = String(facilityId);
    const reportingPeriodIdStr = reportingPeriodId ? String(reportingPeriodId) : undefined;
  
    return useQuery<GetPlanningFacilitiesResponse>({
      queryFn: () =>
        getPlanningFacilities({
          program,
          facilityType,
          facilityId: facilityIdStr,
          ...(reportingPeriodIdStr && { reportingPeriodId: reportingPeriodIdStr }),
        }),
      queryKey: ["facilities", "planning", program, facilityType, facilityIdStr, reportingPeriodIdStr],
      enabled: !!program && !!facilityType && !!facilityId,
    });
  }