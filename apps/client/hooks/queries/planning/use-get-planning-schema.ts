// import getPlanningFormSchema, {
//   type GetPlanningFormSchemaRequest,
//   type GetPlanningFormSchemaResponse,
// } from "@/fetchers/planning/get-form-schema";
// import { useQuery } from "@tanstack/react-query";

// function useGetPlanningSchema(params: GetPlanningFormSchemaRequest) {
//   const { projectType, facilityType } = params ?? ({} as any);

//   return useQuery<GetPlanningFormSchemaResponse>({
//     queryFn: () => getPlanningFormSchema({ projectType, facilityType }),
//     queryKey: ["planning", "schema", projectType, facilityType],
//     enabled: Boolean(projectType) && Boolean(facilityType),
//   });
// }

// export default useGetPlanningSchema;


// v2
import { useQuery } from "@tanstack/react-query";
import { getPlanningSchema } from "@/fetchers/planning/get-planning-schema";

interface UsePlanningSchemaParams {
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  enabled?: boolean;
}

export function usePlanningSchema({ 
  projectType, 
  facilityType,
  enabled = true 
}: UsePlanningSchemaParams) {
  return useQuery({
    queryKey: ["planning", "schema", projectType, facilityType],
    queryFn: () => getPlanningSchema({ projectType, facilityType }),
    enabled: enabled && !!projectType && !!facilityType,
    staleTime: 30 * 60 * 1000, // 30 minutes (schemas rarely change)
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 3,
  });
}



