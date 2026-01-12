/**
 * Period Lock Error Dialog - Example Implementation
 * 
 * This file demonstrates how to use the PeriodLockErrorDialog component
 * in planning and execution forms.
 */

import { useState } from "react";
import { usePeriodLockError } from "@/hooks/use-period-lock-error";
import { PeriodLockErrorDialog } from "./period-lock-error-dialog";
import { useCreatePlanning, useUpdatePlanning } from "@/hooks/mutations/planning";
import { useCreateExecution, useUpdateExecution } from "@/hooks/mutations/executions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Example 1: Planning Form with Period Lock Error Handling
 */
export function PlanningFormExample() {
  const [formData, setFormData] = useState({
    projectId: 1,
    facilityId: 1,
    reportingPeriodId: 1,
    schemaId: 1,
    formData: { activities: {} },
  });

  // Period information (typically from props or context)
  const periodName = "January 2024";
  const projectName = "Malaria Control Program";
  const facilityName = "Central District Hospital";

  // Set up period lock error handling
  const {
    periodLockError,
    showPeriodLockDialog,
    setShowPeriodLockDialog,
    handleMutationError,
  } = usePeriodLockError({
    periodName,
    projectName,
    facilityName,
    onPeriodLockError: (error) => {
      // Optional: Custom logging or analytics
      console.log("Period lock error occurred:", error);
    },
  });

  // Create mutation with error handling
  const createMutation = useCreatePlanning({
    onPeriodLockError: handleMutationError,
    onSuccess: (data) => {
      toast.success("Planning data created successfully");
      console.log("Created:", data);
    },
  });

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync(formData);
    } catch (error) {
      // Period lock errors are handled automatically by the hook
      // Other errors are shown via toast by the mutation hook
      console.error("Submit error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Planning Form</h2>
      
      <div className="bg-muted p-4 rounded-md">
        <p className="text-sm text-muted-foreground">
          Period: {periodName} | Project: {projectName} | Facility: {facilityName}
        </p>
      </div>

      {/* Your form fields here */}
      <div className="space-y-2">
        <p>Form fields would go here...</p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? "Submitting..." : "Submit Planning Data"}
      </Button>

      {/* Period lock error dialog */}
      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        periodName={periodLockError?.periodName}
        projectName={periodLockError?.projectName}
        facilityName={periodLockError?.facilityName}
      />
    </div>
  );
}

/**
 * Example 2: Execution Form with Period Lock Error Handling
 */
export function ExecutionFormExample() {
  const executionId = 123;
  const periodName = "Q1 2024";
  const projectName = "TB Control Program";
  const facilityName = "Regional Health Center";

  const {
    periodLockError,
    showPeriodLockDialog,
    setShowPeriodLockDialog,
    handleMutationError,
  } = usePeriodLockError({
    periodName,
    projectName,
    facilityName,
  });

  const updateMutation = useUpdateExecution({
    onPeriodLockError: handleMutationError,
    onSuccess: (data) => {
      toast.success("Execution data updated successfully");
    },
  });

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        params: { id: executionId },
        body: {
          formData: { activities: [], quarter: "Q1" },
        },
      });
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Execution Form</h2>
      
      <div className="bg-muted p-4 rounded-md">
        <p className="text-sm text-muted-foreground">
          Period: {periodName} | Project: {projectName} | Facility: {facilityName}
        </p>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Updating..." : "Update Execution Data"}
      </Button>

      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        periodName={periodLockError?.periodName}
        projectName={periodLockError?.projectName}
        facilityName={periodLockError?.facilityName}
      />
    </div>
  );
}

/**
 * Example 3: Advanced Usage with Custom Error Handling
 */
export function AdvancedFormExample() {
  const [showDialog, setShowDialog] = useState(false);
  const [errorInfo, setErrorInfo] = useState<any>(null);

  const createMutation = useCreatePlanning({
    onPeriodLockError: (error) => {
      // Custom error handling logic
      console.error("Period is locked:", error);
      
      // You could fetch additional information here
      setErrorInfo({
        periodName: "February 2024",
        projectName: "HIV/AIDS Program",
        facilityName: "Provincial Hospital",
        lockedBy: "John Doe",
        lockedAt: new Date().toISOString(),
      });
      
      setShowDialog(true);
      
      // Send to analytics
      // analytics.track('period_lock_error', { error });
    },
    onError: (error) => {
      // Handle other types of errors
      console.error("General error:", error);
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Advanced Form</h2>
      
      <Button onClick={() => createMutation.mutate({} as any)}>
        Trigger Error
      </Button>

      <PeriodLockErrorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        periodName={errorInfo?.periodName}
        projectName={errorInfo?.projectName}
        facilityName={errorInfo?.facilityName}
        lockedBy={errorInfo?.lockedBy}
        lockedAt={errorInfo?.lockedAt}
        adminEmail="finance.admin@example.com"
      />
    </div>
  );
}

/**
 * Example 4: Multiple Mutations in One Form
 */
export function MultiMutationFormExample() {
  const periodName = "March 2024";
  const projectName = "Nutrition Program";
  const facilityName = "Community Health Center";

  const {
    periodLockError,
    showPeriodLockDialog,
    setShowPeriodLockDialog,
    handleMutationError,
  } = usePeriodLockError({
    periodName,
    projectName,
    facilityName,
  });

  // Multiple mutations all using the same error handler
  const createMutation = useCreatePlanning({
    onPeriodLockError: handleMutationError,
  });

  const updateMutation = useUpdatePlanning({
    onPeriodLockError: handleMutationError,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Multi-Mutation Form</h2>
      
      <div className="flex gap-2">
        <Button onClick={() => createMutation.mutate({} as any)}>
          Create
        </Button>
        <Button onClick={() => updateMutation.mutate({ id: 1, data: {} as any })}>
          Update
        </Button>
      </div>

      {/* Single dialog handles errors from all mutations */}
      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        periodName={periodLockError?.periodName}
        projectName={periodLockError?.projectName}
        facilityName={periodLockError?.facilityName}
      />
    </div>
  );
}
