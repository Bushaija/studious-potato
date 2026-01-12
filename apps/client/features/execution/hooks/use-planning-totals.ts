import { useQuery } from "@tanstack/react-query";
import { honoClient, handleHonoResponse } from "@/api-client/index";
import { InferResponseType } from "hono";

// Get the planning totals API endpoint
const planningActivitiesApi = honoClient.api["planning-activities"] as any;
const $getPlanningTotals = planningActivitiesApi["totals"][":facilityId"]["$get"] as any;

// Type for the API response
type GetPlanningTotalsResponse = InferResponseType<typeof $getPlanningTotals>;

export interface PlanningTotals {
  facilityId: number;
  q1Total: number;
  q2Total: number;
  q3Total: number;
  q4Total: number;
  grandTotal: number;
  recordCount: number;
}

// API function
const getPlanningTotals = async (facilityId: number) =>
  handleHonoResponse<GetPlanningTotalsResponse>(
    $getPlanningTotals({ 
      param: { 
        facilityId: facilityId.toString() 
      } 
    })
  );

// Query keys
export const planningTotalsKeys = {
  all: ["planning-totals"] as const,
  byFacility: (facilityId: number) => [
    ...planningTotalsKeys.all,
    "facility",
    facilityId,
  ] as const,
};

// Custom hook
export function usePlanningTotals(
  facilityId: number | null,
  enabled: boolean = true
) {
  return useQuery<PlanningTotals, Error>({
    queryKey: planningTotalsKeys.byFacility(facilityId || 0),
    queryFn: () => getPlanningTotals(facilityId!),
    enabled: enabled && !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 