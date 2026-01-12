# Period Lock Error Handling Guide

This guide explains how to implement period lock error handling in planning and execution forms.

## Overview

When a reporting period is locked (due to an approved financial report), users cannot create, edit, or delete planning/execution data for that period. The system provides:

1. **Automatic error detection** in mutation hooks
2. **User-friendly error dialog** with period information
3. **Contact administrator functionality** for unlock requests

## Components

### 1. PeriodLockErrorDialog

A dialog component that displays period lock information and provides a way to contact administrators.

### 2. usePeriodLockError Hook

A custom hook that manages period lock error state and provides error handling logic.

### 3. Updated Mutation Hooks

All planning and execution mutation hooks now include period lock error detection:
- `useCreatePlanning`
- `useUpdatePlanning`
- `useDeletePlanning`
- `useCreateExecution`
- `useUpdateExecution`
- `useDeleteExecution`

## Implementation

### Basic Usage (Recommended)

Use the `usePeriodLockError` hook for automatic error handling:

```tsx
import { usePeriodLockError } from "@/hooks/use-period-lock-error";
import { PeriodLockErrorDialog } from "@/components/errors";
import { useCreatePlanning } from "@/hooks/mutations/planning/use-create-planning";

function PlanningForm() {
  // Get period information from your form state
  const periodName = "January 2024";
  const projectName = "Malaria Control";
  const facilityName = "Central Hospital";

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
  });

  // Use mutation with error handler
  const createMutation = useCreatePlanning({
    onPeriodLockError: handleMutationError,
    onSuccess: (data) => {
      toast.success("Planning data created successfully");
    },
  });

  const handleSubmit = async (data) => {
    try {
      await createMutation.mutateAsync(data);
    } catch (error) {
      // Period lock errors are handled automatically
      // Other errors will be shown via toast
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Your form fields */}
      </form>

      {/* Period lock error dialog */}
      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        periodName={periodLockError?.periodName}
        projectName={periodLockError?.projectName}
        facilityName={periodLockError?.facilityName}
      />
    </>
  );
}
```

### Advanced Usage (Custom Error Handling)

For more control over error handling:

```tsx
import { useState } from "react";
import { PeriodLockErrorDialog } from "@/components/errors";
import { useCreatePlanning } from "@/hooks/mutations/planning/use-create-planning";
import { checkPeriodLockError } from "@/lib/period-lock-error";

function AdvancedPlanningForm() {
  const [showPeriodLockDialog, setShowPeriodLockDialog] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const createMutation = useCreatePlanning({
    onPeriodLockError: (error) => {
      // Custom handling before showing dialog
      console.log("Period lock error occurred:", error);
      
      // Extract additional info from error if available
      setErrorDetails({
        periodName: "January 2024",
        projectName: "Malaria Control",
        facilityName: "Central Hospital",
      });
      
      setShowPeriodLockDialog(true);
    },
    onError: (error) => {
      // Handle non-period-lock errors
      const lockError = checkPeriodLockError(error);
      if (!lockError.isPeriodLockError) {
        // Custom error handling for other errors
        console.error("Other error:", error);
      }
    },
  });

  return (
    <>
      <form>{/* Your form */}</form>
      
      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        {...errorDetails}
      />
    </>
  );
}
```

### Execution Form Example

```tsx
import { usePeriodLockError } from "@/hooks/use-period-lock-error";
import { PeriodLockErrorDialog } from "@/components/errors";
import { useUpdateExecution } from "@/hooks/mutations/executions/use-update-execution";

function ExecutionForm({ executionId, periodName, projectName, facilityName }) {
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
  });

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync({
      params: { id: executionId },
      body: data,
    });
  };

  return (
    <>
      <form>{/* Your form */}</form>
      
      <PeriodLockErrorDialog
        open={showPeriodLockDialog}
        onOpenChange={setShowPeriodLockDialog}
        periodName={periodLockError?.periodName}
        projectName={periodLockError?.projectName}
        facilityName={periodLockError?.facilityName}
      />
    </>
  );
}
```

## Error Detection

The system automatically detects period lock errors by checking for:
1. HTTP 403 (Forbidden) status code
2. Error message containing "locked" keyword

The middleware returns this message:
```
"This reporting period is locked due to an approved financial report. Contact an administrator to unlock."
```

## Contact Administrator Feature

The dialog includes a "Contact Administrator" button that:
1. Opens the user's email client
2. Pre-fills the subject and body with period information
3. Allows the user to add their reason for the unlock request

## Testing

To test period lock error handling:

1. Create a financial report and submit it for approval
2. Approve the report (this locks the period)
3. Try to create/edit/delete planning or execution data for that period
4. Verify the error dialog appears with correct information
5. Test the "Contact Administrator" button

## Migration Guide

If you have existing forms without period lock error handling:

1. Import the hook and dialog:
   ```tsx
   import { usePeriodLockError } from "@/hooks/use-period-lock-error";
   import { PeriodLockErrorDialog } from "@/components/errors";
   ```

2. Add the hook to your component:
   ```tsx
   const { handleMutationError, showPeriodLockDialog, setShowPeriodLockDialog, periodLockError } = 
     usePeriodLockError({ periodName, projectName, facilityName });
   ```

3. Update your mutation hooks to use the error handler:
   ```tsx
   const mutation = useCreatePlanning({
     onPeriodLockError: handleMutationError,
   });
   ```

4. Add the dialog to your JSX:
   ```tsx
   <PeriodLockErrorDialog
     open={showPeriodLockDialog}
     onOpenChange={setShowPeriodLockDialog}
     {...periodLockError}
   />
   ```

## API Reference

### usePeriodLockError(options)

**Options:**
- `periodName?: string` - Name of the reporting period
- `projectName?: string` - Name of the project
- `facilityName?: string` - Name of the facility
- `onPeriodLockError?: (error) => void` - Custom error handler

**Returns:**
- `periodLockError: PeriodLockErrorInfo | null` - Current error information
- `showPeriodLockDialog: boolean` - Dialog visibility state
- `setShowPeriodLockDialog: (show: boolean) => void` - Set dialog visibility
- `handleMutationError: (error: any) => boolean` - Error handler function
- `resetError: () => void` - Reset error state

### PeriodLockErrorDialog Props

- `open: boolean` - Dialog visibility
- `onOpenChange: (open: boolean) => void` - Visibility change handler
- `periodName?: string` - Name of the locked period
- `projectName?: string` - Name of the project
- `facilityName?: string` - Name of the facility
- `lockedBy?: string` - User who locked the period
- `lockedAt?: string` - When the period was locked
- `adminEmail?: string` - Administrator email (default: "admin@example.com")

## Best Practices

1. **Always provide context**: Pass period, project, and facility names to the hook
2. **Handle all mutations**: Apply error handling to create, update, and delete operations
3. **Test thoroughly**: Verify error handling works for all form scenarios
4. **Customize admin email**: Update the default admin email in your environment
5. **Log errors**: Use the `onPeriodLockError` callback for logging/analytics
