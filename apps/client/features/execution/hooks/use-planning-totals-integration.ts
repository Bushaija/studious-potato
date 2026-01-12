import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useGetPlanDataByFacilityId } from '@/features/planning-data/api/use-get-planning-by-facility-id';
import { 
  calculatePlanningQuarterlyTotals, 
  applyPlanningTotalsToExecutionData,
  PlanningQuarterlyTotals 
} from '@/features/execution/utils/index';
import { FinancialRow, calculateHierarchicalTotals } from '@/features/execution/schemas/execution-form-schema';

export interface UsePlanningTotalsIntegrationProps {
  facilityId: number | null;
  isReadOnly: boolean;
  enabled?: boolean;
}

export interface UsePlanningTotalsIntegrationReturn {
  planningTotals: PlanningQuarterlyTotals;
  isLoading: boolean;
  error: any;
  applyTotalsToFormData: (formData: FinancialRow[]) => FinancialRow[];
  hasActivePlanning: boolean;
}

/**
 * Custom hook to manage planning totals integration with execution form
 * Handles fetching planning data, calculating totals, and applying to form data
 */
export function usePlanningTotalsIntegration({
  facilityId,
  isReadOnly,
  enabled = true
}: UsePlanningTotalsIntegrationProps): UsePlanningTotalsIntegrationReturn {
  
  // Fetch planning data for auto-filling "Transfers from SPIU/RBC"
  const { 
    data: planningData, 
    isLoading, 
    error 
  } = useGetPlanDataByFacilityId(
    facilityId,
    !!facilityId && !isReadOnly && enabled
  );

  // Calculate planning quarterly totals for auto-fill
  const planningTotals = useMemo((): PlanningQuarterlyTotals => {
    if (!planningData?.activities || planningData.activities.length === 0) {
      return { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    }
    
    const totals = calculatePlanningQuarterlyTotals(planningData.activities);
    return totals;
  }, [planningData, facilityId, isReadOnly, enabled]);

  // Check if there's active planning data
  const hasActivePlanning = planningTotals.total > 0;

  // Function to apply planning totals to form data
  const applyTotalsToFormData = (formData: FinancialRow[]): FinancialRow[] => {
    if (!hasActivePlanning) return formData;
    
    const updatedData = applyPlanningTotalsToExecutionData(formData, planningTotals);
    return calculateHierarchicalTotals(updatedData);
  };

  // Handle loading and error states with toast notifications
  useEffect(() => {
    if (isLoading && facilityId && !isReadOnly && enabled) {
      toast.loading("Loading planning data for auto-fill...", { id: 'planning-data-loading' });
    } else {
      toast.dismiss('planning-data-loading');
    }

    if (error && facilityId && !isReadOnly && enabled) {
      toast.error("Failed to load planning data for auto-fill");
    }
  }, [isLoading, error, facilityId, isReadOnly, enabled]);

  // Show success notification when planning totals are applied
  useEffect(() => {
    if (hasActivePlanning && !isReadOnly && enabled && planningTotals.total > 0) {
      toast.success(
        `"Transfers from SPIU/RBC" field auto-filled with planning data totals (${planningTotals.total.toLocaleString()})`,
        { duration: 4000 }
      );
    }
  }, [hasActivePlanning, planningTotals.total, isReadOnly, enabled]);

  return {
    planningTotals,
    isLoading,
    error,
    applyTotalsToFormData,
    hasActivePlanning
  };
}