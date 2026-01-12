import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSmartExecutionSubmission, type SmartExecutionSubmissionParams } from "@/hooks/mutations/executions/use-smart-execution-submission";

interface UseExecutionSubmissionHandlerParams {
  projectType: "HIV" | "MAL" | "TB"; // Changed from "Malaria" to "MAL" for consistency with activity codes
  facilityType: "hospital" | "health_center";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  schemaId?: number;
  isValid: boolean;
  canSubmitExecution: boolean;
  validationErrors?: Array<{ field: string; message: string; type: 'error' | 'warning' }>;
}

interface SubmissionData {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  facilityName: string;
  activities: Array<{
    code: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    comment: string;
    paymentStatus?: "paid" | "unpaid" | "partial";
    amountPaid?: number;
  }>;
  programName?: string;
}

export function useExecutionSubmissionHandler({
  projectType,
  facilityType,
  quarter,
  schemaId,
  isValid,
  canSubmitExecution,
  validationErrors = [],
}: UseExecutionSubmissionHandlerParams) {
  const router = useRouter();

  const smartSubmissionMutation = useSmartExecutionSubmission({
    onSuccess: (_data, isUpdate) => {
      const action = isUpdate ? "updated" : "created";
      toast.success(`Execution ${action} successfully`, {
        description: isUpdate
          ? "The quarterly data has been merged with the existing execution record."
          : "A new execution record has been created for this combination.",
      });

      // Navigate back to the execution list
      router.push("/dashboard/execution");
    },
    onError: (error: any, isUpdate) => {
      const action = isUpdate ? "update" : "create";
      
      console.log('🔴 [Submission Error]:', { error, message: error.message, response: error.response });
      
      // Parse and format error message for better user experience
      let title = `Failed to ${action} execution`;
      let description = error.message || 'An unexpected error occurred';
      
      // Try to parse the error response
      let errorData: any = null;
      try {
        // Check if error.message is a JSON string
        if (typeof error.message === 'string' && error.message.includes('{')) {
          errorData = JSON.parse(error.message);
        } else if (error.response?.data) {
          errorData = error.response.data;
        } else if (error.data) {
          errorData = error.data;
        }
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      
      // Check if it's an accounting equation error
      if (errorData?.message?.includes("Accounting equation validation failed") || 
          error.message?.includes("Accounting equation validation failed")) {
        title = "Accounting Equation Imbalance";
        
        const accountingError = errorData?.errors?.find((e: any) => e.code === "ACCOUNTING_EQUATION_IMBALANCE");
        
        if (accountingError) {
          // Extract the numbers from the message
          const match = accountingError.message.match(/Net Financial Assets \(([\d.]+)\) must equal Closing Balance \(([\d.]+)\)\. Difference: ([\d.]+)/);
          if (match) {
            const [, netAssets, closingBalance, difference] = match;
            description = `The accounting equation is not balanced. Section F must equal Section G.\n\n` +
              `Section F (Net Financial Assets): ${Number(netAssets).toLocaleString()}\n` +
              `Section G (Closing Balance): ${Number(closingBalance).toLocaleString()}\n` +
              `Variance: ${Number(difference).toLocaleString()}\n\n` +
              `Please reconcile your financial assets and liabilities to balance the accounts.`;
          } else {
            description = accountingError.message;
          }
        }
      }
      
      toast.error(title, {
        description,
        duration: 8000, // Longer duration for complex errors
      });
    },
  });

  const handleSubmission = useCallback(
    async (submissionData: SubmissionData) => {
      // Validate required fields
      if (!isValid || !canSubmitExecution) {
        // Show specific validation errors if available
        const errorMessages = validationErrors
          .filter(e => e.type === 'error')
          .map(e => e.message)
          .slice(0, 3); // Show up to 3 errors
        
        const description = errorMessages.length > 0
          ? errorMessages.join('\n')
          : "Please fix validation errors before submitting.";
        
        toast.error("Form validation failed", {
          description,
          duration: 6000, // Longer duration for multiple errors
        });
        return;
      }

      if (!schemaId || !submissionData.projectId || !submissionData.facilityId || !submissionData.reportingPeriodId) {
        toast.error("Missing required fields to submit execution", {
          description: `schemaId=${schemaId} projectId=${submissionData.projectId} facilityId=${submissionData.facilityId} reportingPeriodId=${submissionData.reportingPeriodId}`,
        });
        return;
      }

      if (submissionData.activities.length === 0) {
        toast.error("No activities to submit", {
          description: "Please enter at least one activity before submitting.",
        });
        return;
      }

      const params: SmartExecutionSubmissionParams = {
        projectId: submissionData.projectId,
        facilityId: submissionData.facilityId,
        reportingPeriodId: submissionData.reportingPeriodId,
        schemaId,
        formData: {
          activities: submissionData.activities,
          quarter,
        },
        metadata: {
          projectType,
          facilityType,
          quarter,
          facilityName: submissionData.facilityName,
          program: submissionData.programName || projectType,
          projectId: submissionData.projectId,
          facilityId: submissionData.facilityId,
          reportingPeriodId: submissionData.reportingPeriodId,
          source: "dynamic-execution-v2",
        },
      };

      try {
        await smartSubmissionMutation.mutateAsync(params);
      } catch (error) {
        // Error handling is done in the onError callback
        console.error("Execution submission error:", error);
      }
    },
    [
      isValid,
      canSubmitExecution,
      validationErrors,
      schemaId,
      quarter,
      projectType,
      facilityType,
      smartSubmissionMutation,
    ]
  );

  return {
    handleSubmission,
    isSubmitting: smartSubmissionMutation.isPending,
    error: smartSubmissionMutation.error,
  };
}
