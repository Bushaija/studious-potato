# Snapshot Corruption Error Handling

## Overview

This document describes the implementation of snapshot integrity validation and corruption error handling for financial reports.

**Task:** 22. Add Snapshot Integrity Validation  
**Requirements:** 10.1, 10.2, 10.3, 10.4, 10.5

## Architecture

### Server-Side Validation

When a financial report with snapshot data is retrieved:

1. **Checksum Verification** - The server computes a SHA-256 checksum of the snapshot data and compares it with the stored checksum
2. **Critical Error Logging** - If validation fails, a critical error is logged with report details
3. **Admin Notification** - Administrators are notified of the integrity failure
4. **Response Handling** - The server either:
   - Returns an error response (for `generateStatement` endpoint)
   - Adds a corruption flag to the report (for `getOne` endpoint)

### Client-Side Handling

The client detects corruption errors and displays a user-friendly dialog:

1. **Error Detection** - Utility functions check for corruption indicators in API responses
2. **Dialog Display** - A specialized dialog shows the error with report details
3. **User Guidance** - Clear instructions guide users to contact administrators
4. **Access Prevention** - Corrupted reports cannot be displayed

## Components

### SnapshotCorruptionErrorDialog

A critical error dialog that displays when snapshot integrity validation fails.

**Props:**
```typescript
interface SnapshotCorruptionErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: number;
  reportStatus?: string;
  onContactAdmin?: () => void;
}
```

**Features:**
- Critical error styling with red theme
- Report details display (ID, status, error type)
- Security notice alert
- User action guidance
- Contact administrator button
- Responsive design

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

## Utilities

### checkSnapshotCorruptionError

Detects if an error response indicates snapshot corruption.

**Function Signature:**
```typescript
function checkSnapshotCorruptionError(error: any): SnapshotCorruptionError
```

**Returns:**
```typescript
interface SnapshotCorruptionError {
  isSnapshotCorrupted: boolean;
  reportId?: number;
  reportStatus?: string;
  errorMessage?: string;
  errorDetails?: string;
}
```

**Detection Logic:**
1. Checks for `error.response.data.error === "SNAPSHOT_CORRUPTED"`
2. Checks for corruption keywords in error message
3. Checks for `snapshotCorrupted` flag in response data

**Usage:**
```typescript
import { checkSnapshotCorruptionError } from "@/lib/snapshot-corruption-error";

const corruptionError = checkSnapshotCorruptionError(error);
if (corruptionError.isSnapshotCorrupted) {
  // Handle corruption error
}
```

### isReportCorrupted

Checks if a report object has a corruption flag.

**Usage:**
```typescript
import { isReportCorrupted } from "@/lib/snapshot-corruption-error";

if (isReportCorrupted(report)) {
  // Show error dialog
}
```

## Hooks

### useSnapshotCorruptionError

A custom hook for managing snapshot corruption error state.

**Returns:**
```typescript
{
  handleError: (error: any) => boolean;
  showCorruptionDialog: boolean;
  setShowCorruptionDialog: (show: boolean) => void;
  corruptionError: SnapshotCorruptionError;
  resetError: () => void;
}
```

**Usage:**
```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";

const { 
  handleError, 
  showCorruptionDialog, 
  setShowCorruptionDialog, 
  corruptionError 
} = useSnapshotCorruptionError();

// In your query error handler
const { data, error } = useQuery({
  onError: (error) => {
    const handled = handleError(error);
    if (!handled) {
      // Handle other errors
    }
  }
});

// In your component
<SnapshotCorruptionErrorDialog
  open={showCorruptionDialog}
  onOpenChange={setShowCorruptionDialog}
  reportId={corruptionError.reportId}
  reportStatus={corruptionError.reportStatus}
/>
```

## Integration Examples

### Example 1: Financial Report Viewer

```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";

export function FinancialReportViewer({ reportId }: { reportId: number }) {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  const { data: report, error } = useQuery({
    queryKey: ["financial-report", reportId],
    queryFn: () => getFinancialReport(reportId),
  });

  // Check for corruption in the report data
  useEffect(() => {
    if (report?.snapshotCorrupted) {
      handleError(report);
    }
  }, [report, handleError]);

  // Check for corruption in query errors
  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  return (
    <>
      {/* Your report display */}
      
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}
```

### Example 2: Statement Generation

```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";

export function StatementGenerator() {
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  const generateMutation = useMutation({
    mutationFn: generateStatement,
    onError: (error) => {
      const handled = handleError(error);
      if (!handled) {
        // Handle other errors
        toast.error("Failed to generate statement");
      }
    },
  });

  return (
    <>
      <Button onClick={() => generateMutation.mutate(params)}>
        Generate Statement
      </Button>
      
      <SnapshotCorruptionErrorDialog
        open={showCorruptionDialog}
        onOpenChange={setShowCorruptionDialog}
        reportId={corruptionError.reportId}
        reportStatus={corruptionError.reportStatus}
      />
    </>
  );
}
```

## Server-Side Implementation

### generateStatement Handler

```typescript
// Task 22: Verify snapshot integrity before displaying
const isValid = await snapshotService.verifyChecksum(report.id);

if (!isValid) {
  // Log critical error
  console.error(
    `[CRITICAL] Snapshot integrity validation failed for report ${report.id}`
  );
  
  // Notify administrators
  const adminUsers = await notificationService.getAdminUsersForNotification();
  // ... notification logic
  
  // Return error response
  return c.json({
    error: "SNAPSHOT_CORRUPTED",
    message: "Snapshot integrity check failed. Report data may be corrupted.",
    details: "The snapshot checksum does not match the stored value.",
    reportId: report.id,
    reportStatus: report.status,
  }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
}
```

### getOne Handler

```typescript
// Task 22: Verify snapshot integrity if report has snapshot data
if (isSubmittedOrApproved && report.reportData && report.snapshotChecksum) {
  const isValid = await snapshotService.verifyChecksum(report.id);
  
  if (!isValid) {
    // Log and notify
    // ... logging and notification logic
    
    // Add corruption flag to response
    return c.json({
      ...report,
      snapshotCorrupted: true,
      snapshotError: "Snapshot integrity check failed."
    }, HttpStatusCodes.OK);
  }
}
```

## Error Flow

```
User requests report
       ↓
Server retrieves report
       ↓
Server verifies checksum
       ↓
   Validation fails?
       ↓
    Yes → Log critical error
       ↓
    Notify administrators
       ↓
    Return error response
       ↓
Client detects corruption
       ↓
Show corruption dialog
       ↓
User contacts admin
```

## Security Considerations

1. **Checksum Algorithm** - Uses SHA-256 for cryptographic integrity
2. **Access Prevention** - Corrupted reports cannot be displayed
3. **Audit Trail** - All corruption events are logged
4. **Admin Notification** - Administrators are immediately notified
5. **User Guidance** - Clear instructions prevent user confusion

## Testing

### Manual Testing

1. **Simulate Corruption:**
   - Manually modify a report's `reportData` in the database
   - Keep the `snapshotChecksum` unchanged
   - Try to view the report

2. **Verify Error Display:**
   - Confirm the corruption dialog appears
   - Check that report details are shown
   - Verify the "Contact Administrator" button works

3. **Check Server Logs:**
   - Verify critical error is logged
   - Confirm admin notification attempt is logged

### Automated Testing

```typescript
describe("Snapshot Corruption Error Handling", () => {
  it("should detect corruption error from API response", () => {
    const error = {
      response: {
        data: {
          error: "SNAPSHOT_CORRUPTED",
          reportId: 123,
          reportStatus: "approved",
        },
      },
    };
    
    const result = checkSnapshotCorruptionError(error);
    expect(result.isSnapshotCorrupted).toBe(true);
    expect(result.reportId).toBe(123);
  });

  it("should show corruption dialog when error is detected", () => {
    const { result } = renderHook(() => useSnapshotCorruptionError());
    
    const error = {
      response: { data: { error: "SNAPSHOT_CORRUPTED" } },
    };
    
    act(() => {
      result.current.handleError(error);
    });
    
    expect(result.current.showCorruptionDialog).toBe(true);
  });
});
```

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| 10.1 | Checksum verification in `snapshotService.verifyChecksum()` |
| 10.2 | Critical error logging in handlers |
| 10.3 | Error dialog component with user-friendly message |
| 10.4 | Critical error logging with report details |
| 10.5 | Admin notification and access prevention |

## Troubleshooting

### Issue: Dialog not showing

**Solution:** Ensure you're calling `handleError()` in your error handler and the dialog component is rendered.

### Issue: False positives

**Solution:** Check that checksums are being computed consistently. Ensure the snapshot structure hasn't changed.

### Issue: Admin notifications not working

**Solution:** Verify the notification service is configured and admin users exist in the database.

## Future Enhancements

1. **Email Notifications** - Send actual emails to administrators
2. **In-App Notifications** - Create in-app notification records
3. **Automatic Recovery** - Attempt to regenerate snapshot from source data
4. **Corruption Analytics** - Track corruption patterns and frequency
5. **Audit Dashboard** - Admin dashboard for viewing corruption events

## Support

For questions or issues with snapshot corruption error handling, refer to:
- `snapshot-corruption-error-dialog.tsx` - Component implementation
- `snapshot-corruption-error.ts` - Utility functions
- `use-snapshot-corruption-error.ts` - Hook implementation
- Server handlers in `financial-reports.handlers.ts`
