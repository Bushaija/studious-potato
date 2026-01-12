import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreateExecution } from "./use-create-execution";
import { useUpdateExecution } from "./use-update-execution";
import { checkExistingExecution } from "@/fetchers/execution/check-existing-execution";
import type { CreateExecutionRequest } from "@/fetchers/execution/create-execution";
import type { UpdateExecutionRequest } from "@/fetchers/execution/update-execution";

interface SmartExecutionSubmissionParams {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  schemaId: number;
  formData: {
    activities: Array<{
      code: string;
      q1: number;
      q2: number;
      q3: number;
      q4: number;
      comment: string;
      paymentStatus?: "paid" | "unpaid" | "partial" | Record<string, "paid" | "unpaid" | "partial">;
      amountPaid?: number | Record<string, number>;
      // VAT tracking fields (quarter-specific)
      netAmount?: Record<string, number>;
      vatAmount?: Record<string, number>;
      vatCleared?: Record<string, number>;
    }>;
    quarter: "Q1" | "Q2" | "Q3" | "Q4";
  };
  metadata: {
    projectType: string;
    facilityType: string;
    quarter: string;
    facilityName: string;
    program: string;
    projectId: number;
    facilityId: number;
    reportingPeriodId: number;
    source: string;
  };
}

interface UseSmartExecutionSubmissionOptions {
  onSuccess?: (data: any, isUpdate: boolean) => void;
  onError?: (error: Error, isUpdate: boolean) => void;
}

export function useSmartExecutionSubmission(options?: UseSmartExecutionSubmissionOptions) {
  const queryClient = useQueryClient();
  const createExecutionMutation = useCreateExecution();
  const updateExecutionMutation = useUpdateExecution();

  return useMutation({
    mutationFn: async (params: SmartExecutionSubmissionParams) => {
      // First, check if an execution record already exists
      const { projectId, facilityId, reportingPeriodId } = params;
      
      // Use the existing fetcher function directly
      const existingData = await checkExistingExecution({
        projectId: String(projectId),
        facilityId: String(facilityId),
        reportingPeriodId: String(reportingPeriodId)
      });
      
      if (existingData.exists && existingData.entry) {
        // UPDATE: Record exists, merge quarterly data with existing activities
        const existingId = existingData.entry.id;
        
        // Merge existing activities with new quarter data
        const existingActivitiesRaw = existingData.entry.formData?.activities || {};
        const newActivities = params.formData.activities || [];
        
        
        // Normalize existing activities to array format
        let existingActivities: any[] = [];
        if (Array.isArray(existingActivitiesRaw)) {
          existingActivities = existingActivitiesRaw;
        } else if (typeof existingActivitiesRaw === 'object' && existingActivitiesRaw !== null) {
          // Convert object format to array format
          existingActivities = Object.entries(existingActivitiesRaw).map(([code, activityData]) => ({
            code,
            ...(typeof activityData === 'object' && activityData !== null ? activityData : {})
          }));
        }
        
        // Create a map of existing activities by code
        const existingActivityMap = existingActivities.reduce((acc: Record<string, any>, activity: any) => {
          acc[activity.code] = activity;
          return acc;
        }, {});
        
        // Merge activities: keep existing data, update/add new quarter data
        const mergedActivities = newActivities.map(newActivity => {
          const existing = existingActivityMap[newActivity.code];
          if (existing) {
            // Merge existing quarter data with new quarter data, preserving existing quarters
            const currentQuarter = params.formData.quarter.toLowerCase();
            const mergedActivity = { ...existing };
            
            // Only update the current quarter's data, preserve all other quarters
            if (currentQuarter === 'q1') {
              mergedActivity.q1 = newActivity.q1;
            } else if (currentQuarter === 'q2') {
              mergedActivity.q2 = newActivity.q2;
            } else if (currentQuarter === 'q3') {
              mergedActivity.q3 = newActivity.q3;
            } else if (currentQuarter === 'q4') {
              mergedActivity.q4 = newActivity.q4;
            }
            
            // Always update comment if provided
            if (newActivity.comment !== undefined) {
              mergedActivity.comment = newActivity.comment;
            }
            
            // Always update payment tracking data if provided
            if ((newActivity as any).paymentStatus !== undefined) {
              mergedActivity.paymentStatus = (newActivity as any).paymentStatus;
            }
            if ((newActivity as any).amountPaid !== undefined) {
              mergedActivity.amountPaid = (newActivity as any).amountPaid;
            }
            
            // Always update VAT tracking data if provided
            if ((newActivity as any).netAmount !== undefined) {
              mergedActivity.netAmount = (newActivity as any).netAmount;
            }
            if ((newActivity as any).vatAmount !== undefined) {
              mergedActivity.vatAmount = (newActivity as any).vatAmount;
            }
            if ((newActivity as any).vatCleared !== undefined) {
              mergedActivity.vatCleared = (newActivity as any).vatCleared;
            }
            
            return mergedActivity;
          }
          return newActivity;
        });
        
        // Add any existing activities that weren't in the new data
        Object.values(existingActivityMap).forEach((existingActivity: any) => {
          if (!newActivities.find(na => na.code === existingActivity.code)) {
            mergedActivities.push(existingActivity);
          }
        });
        
        const updateBody: UpdateExecutionRequest = {
          formData: {
            activities: mergedActivities,
            quarter: params.formData.quarter,
          }
        };
        console.log("update body:: ", updateBody)
        
        const result = await updateExecutionMutation.mutateAsync({
          params: { id: existingId },
          body: updateBody
        });
        
        return { data: result, isUpdate: true, existingEntry: existingData.entry };
      } else {
        // CREATE: No record exists, create new one
        const createBody: CreateExecutionRequest = {
          schemaId: params.schemaId,
          projectId: params.projectId,
          facilityId: params.facilityId,
          reportingPeriodId: params.reportingPeriodId,
          formData: params.formData,
          metadata: params.metadata
        };
        
        const result = await createExecutionMutation.mutateAsync(createBody);
        
        return { data: result, isUpdate: false, existingEntry: null };
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["execution", "list"]
      });
      
      queryClient.invalidateQueries({
        queryKey: ["execution", "check-existing", variables.projectId, variables.facilityId, variables.reportingPeriodId]
      });
      
      // Set the updated/created data in the cache
      if (result.data?.id) {
        queryClient.setQueryData(["execution", "detail", result.data.id], result.data);
      }
      
      // Call the custom success callback
      options?.onSuccess?.(result.data, result.isUpdate);
    },
    onError: (error, variables) => {
      // Call the custom error callback
      options?.onError?.(error as Error, false); // We don't know if it was update or create that failed
    }
  });
}

export type { SmartExecutionSubmissionParams };
