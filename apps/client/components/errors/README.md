# Error Handling Components

This directory contains reusable error handling components and utilities for the Budget Management System.

## Components

### PeriodLockErrorDialog

A dialog component that displays user-friendly error messages when users attempt to edit data in locked reporting periods.

**Features:**
- Clear error messaging
- Period context display (period, project, facility)
- Lock details (who locked, when)
- Contact administrator functionality
- Responsive design

**Usage:**
```tsx
import { PeriodLockErrorDialog } from "@/components/errors";

<PeriodLockErrorDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  periodName="January 2024"
  projectName="Malaria Control"
  facilityName="Central Hospital"
/>
```

### SnapshotCorruptionErrorDialog

A critical error dialog that displays when snapshot integrity validation fails for financial reports.

**Features:**
- Critical error styling with security notice
- Report details display (ID, status, error type)
- User action guidance
- Contact administrator functionality
- Access prevention for corrupted reports

**Usage:**
```tsx
import { SnapshotCorruptionErrorDialog } from "@/components/errors";

<SnapshotCorruptionErrorDialog
  open={showError}
  onOpenChange={setShowError}
  reportId={123}
  reportStatus="approved"
/>
```

## Hooks

### usePeriodLockError

A custom hook for managing period lock error state and handling.

**Usage:**
```tsx
import { usePeriodLockError } from "@/hooks/use-period-lock-error";

const { handleMutationError, showPeriodLockDialog, setShowPeriodLockDialog, periodLockError } = 
  usePeriodLockError({ periodName, projectName, facilityName });
```

### useSnapshotCorruptionError

A custom hook for managing snapshot corruption error state and detection.

**Usage:**
```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";

const { handleError, showCorruptionDialog, setShowCorruptionDialog, corruptionError } = 
  useSnapshotCorruptionError();
```

## Utilities

### checkPeriodLockError

Detects if an error is a period lock error (403 with "locked" message).

**Usage:**
```tsx
import { checkPeriodLockError } from "@/lib/period-lock-error";

const lockError = checkPeriodLockError(error);
if (lockError.isPeriodLockError) {
  // Handle period lock error
}
```

### checkSnapshotCorruptionError

Detects if an error indicates snapshot corruption (integrity validation failure).

**Usage:**
```tsx
import { checkSnapshotCorruptionError } from "@/lib/snapshot-corruption-error";

const corruptionError = checkSnapshotCorruptionError(error);
if (corruptionError.isSnapshotCorrupted) {
  // Handle snapshot corruption error
}
```

## Documentation

### Period Lock Errors
- **QUICK_START.md** - 5-minute integration guide
- **PERIOD_LOCK_ERROR_HANDLING.md** - Comprehensive implementation guide
- **ERROR_FLOW_DIAGRAM.md** - Visual flow diagrams
- **TASK_21_IMPLEMENTATION_SUMMARY.md** - Implementation details

### Snapshot Corruption Errors
- **SNAPSHOT_CORRUPTION_QUICK_START.md** - 5-minute integration guide
- **SNAPSHOT_CORRUPTION_ERROR_HANDLING.md** - Comprehensive implementation guide

## Examples

### Period Lock Errors
See `period-lock-error-dialog.example.tsx` for working examples of:
- Basic planning form integration
- Execution form integration
- Advanced custom error handling
- Multiple mutations in one form

### Snapshot Corruption Errors
See `snapshot-corruption-error-dialog.example.tsx` for working examples of:
- Basic financial report viewer
- Statement generator with corruption handling
- Report list with corruption indicators
- Custom contact admin handler
- Multiple reports with shared error handler

## Quick Integration

1. Import components:
   ```tsx
   import { usePeriodLockError } from "@/hooks/use-period-lock-error";
   import { PeriodLockErrorDialog } from "@/components/errors";
   ```

2. Add hook:
   ```tsx
   const { handleMutationError, showPeriodLockDialog, setShowPeriodLockDialog, periodLockError } = 
     usePeriodLockError({ periodName, projectName, facilityName });
   ```

3. Update mutation:
   ```tsx
   const mutation = useCreatePlanning({
     onPeriodLockError: handleMutationError,
   });
   ```

4. Add dialog:
   ```tsx
   <PeriodLockErrorDialog
     open={showPeriodLockDialog}
     onOpenChange={setShowPeriodLockDialog}
     {...periodLockError}
   />
   ```

## Supported Mutations

All planning and execution mutations support period lock error handling:

**Planning:**
- useCreatePlanning
- useUpdatePlanning
- useDeletePlanning

**Execution:**
- useCreateExecution
- useUpdateExecution
- useDeleteExecution

## Requirements

This implementation satisfies the following requirements:
- 6.2: Update planning edit forms to catch period lock errors
- 6.3: Display user-friendly error message when edit is blocked
- 6.4: Show period lock information in error dialog
- 7.1: Add link to contact administrator for unlock request
- 7.2: Update execution edit forms with same error handling
- 7.3: Consistent error handling across all edit operations
- 7.4: User-friendly error messages with context

## Testing

To test the implementation:
1. Submit and approve a financial report
2. Try to edit data for that period
3. Verify the error dialog appears
4. Test the "Contact Administrator" button

## Support

For questions or issues, see the comprehensive documentation in `PERIOD_LOCK_ERROR_HANDLING.md`.
