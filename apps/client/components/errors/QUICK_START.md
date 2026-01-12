# Period Lock Error Handling - Quick Start

## 5-Minute Integration Guide

### Step 1: Import Required Components

```tsx
import { usePeriodLockError } from "@/hooks/use-period-lock-error";
import { PeriodLockErrorDialog } from "@/components/errors";
```

### Step 2: Add Hook to Your Form Component

```tsx
function YourForm() {
  // Get period info from your form state/props
  const periodName = "January 2024";
  const projectName = "Malaria Control";
  const facilityName = "Central Hospital";

  // Add the hook
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
```

### Step 3: Update Your Mutation Hooks

**Before:**
```tsx
const createMutation = useCreatePlanning();
```

**After:**
```tsx
const createMutation = useCreatePlanning({
  onPeriodLockError: handleMutationError,
});
```

### Step 4: Add Dialog to Your JSX

```tsx
return (
  <>
    <form>{/* Your form fields */}</form>
    
    <PeriodLockErrorDialog
      open={showPeriodLockDialog}
      onOpenChange={setShowPeriodLockDialog}
      periodName={periodLockError?.periodName}
      projectName={periodLockError?.projectName}
      facilityName={periodLockError?.facilityName}
    />
  </>
);
```

## Complete Example

```tsx
import { usePeriodLockError } from "@/hooks/use-period-lock-error";
import { PeriodLockErrorDialog } from "@/components/errors";
import { useCreatePlanning } from "@/hooks/mutations/planning/use-create-planning";

function PlanningForm({ periodName, projectName, facilityName }) {
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

  const createMutation = useCreatePlanning({
    onPeriodLockError: handleMutationError,
  });

  const handleSubmit = async (data) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Your form fields */}
      </form>
      
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

## Supported Mutations

All these hooks now support period lock error handling:

### Planning
- `useCreatePlanning`
- `useUpdatePlanning`
- `useDeletePlanning`

### Execution
- `useCreateExecution`
- `useUpdateExecution`
- `useDeleteExecution`

## What Happens When Period is Locked?

1. User tries to create/edit/delete data
2. API returns 403 error with "locked" message
3. Mutation hook detects the error
4. Dialog appears with period information
5. User can contact administrator via email

## Testing

To test the implementation:

1. Submit and approve a financial report
2. Try to edit data for that period
3. Verify the error dialog appears
4. Click "Contact Administrator" to test email functionality

## Need Help?

See the full documentation in `PERIOD_LOCK_ERROR_HANDLING.md`
