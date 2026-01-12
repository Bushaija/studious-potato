# Snapshot Corruption Error Handling - Quick Start

## 5-Minute Integration Guide

### Step 1: Import Components (30 seconds)

```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";
```

### Step 2: Add Hook (1 minute)

```tsx
const { 
  handleError, 
  showCorruptionDialog, 
  setShowCorruptionDialog, 
  corruptionError 
} = useSnapshotCorruptionError();
```

### Step 3: Handle Errors (2 minutes)

**For React Query:**
```tsx
const { data: report, error } = useQuery({
  queryKey: ["financial-report", reportId],
  queryFn: () => getFinancialReport(reportId),
});

// Check for corruption in errors
useEffect(() => {
  if (error) {
    handleError(error);
  }
}, [error, handleError]);

// Check for corruption flag in data
useEffect(() => {
  if (report?.snapshotCorrupted) {
    handleError(report);
  }
}, [report, handleError]);
```

**For Mutations:**
```tsx
const mutation = useMutation({
  mutationFn: generateStatement,
  onError: (error) => {
    const handled = handleError(error);
    if (!handled) {
      // Handle other errors
      toast.error("Operation failed");
    }
  },
});
```

### Step 4: Add Dialog (1.5 minutes)

```tsx
<SnapshotCorruptionErrorDialog
  open={showCorruptionDialog}
  onOpenChange={setShowCorruptionDialog}
  reportId={corruptionError.reportId}
  reportStatus={corruptionError.reportStatus}
/>
```

## Complete Example

```tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";
import { getFinancialReport } from "@/fetchers/financial-reports";

export function FinancialReportViewer({ reportId }: { reportId: number }) {
  // Step 2: Add hook
  const { 
    handleError, 
    showCorruptionDialog, 
    setShowCorruptionDialog, 
    corruptionError 
  } = useSnapshotCorruptionError();

  // Fetch report
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["financial-report", reportId],
    queryFn: () => getFinancialReport(reportId),
  });

  // Step 3: Handle errors
  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  useEffect(() => {
    if (report?.snapshotCorrupted) {
      handleError(report);
    }
  }, [report, handleError]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      {/* Your report display */}
      <div>
        <h1>Financial Report {reportId}</h1>
        {/* ... report content ... */}
      </div>
      
      {/* Step 4: Add dialog */}
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

## Testing Your Integration

1. **Simulate Corruption:**
   ```sql
   -- In your database, modify a report's data
   UPDATE financial_reports 
   SET report_data = '{"modified": "data"}'
   WHERE id = 123;
   -- Keep snapshot_checksum unchanged
   ```

2. **View the Report:**
   - Navigate to the report in your app
   - The corruption dialog should appear automatically

3. **Verify Behavior:**
   - ✅ Dialog shows with report details
   - ✅ "Contact Administrator" button works
   - ✅ Report content is not displayed
   - ✅ Server logs show critical error

## Common Patterns

### Pattern 1: Report Viewer

```tsx
// Check both query errors and report data
useEffect(() => {
  if (error) handleError(error);
  if (report?.snapshotCorrupted) handleError(report);
}, [error, report, handleError]);
```

### Pattern 2: Statement Generator

```tsx
// Check mutation errors
const mutation = useMutation({
  onError: (error) => {
    handleError(error) || toast.error("Failed");
  },
});
```

### Pattern 3: Report List

```tsx
// Check each report in the list
reports?.forEach(report => {
  if (report.snapshotCorrupted) {
    // Show indicator or disable access
  }
});
```

## Customization

### Custom Contact Admin Handler

```tsx
<SnapshotCorruptionErrorDialog
  open={showCorruptionDialog}
  onOpenChange={setShowCorruptionDialog}
  reportId={corruptionError.reportId}
  reportStatus={corruptionError.reportStatus}
  onContactAdmin={() => {
    // Custom logic (e.g., open support ticket)
    openSupportTicket({
      type: "snapshot_corruption",
      reportId: corruptionError.reportId,
    });
  }}
/>
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dialog not showing | Check that `handleError()` is called and dialog is rendered |
| Multiple dialogs | Use `resetError()` to clear state between reports |
| False positives | Verify checksum computation is consistent |

## Next Steps

- Read [SNAPSHOT_CORRUPTION_ERROR_HANDLING.md](./SNAPSHOT_CORRUPTION_ERROR_HANDLING.md) for detailed documentation
- Review server-side implementation in `financial-reports.handlers.ts`
- Check `snapshot-service.ts` for checksum verification logic

## Requirements

This implementation satisfies:
- **10.1** - Checksum verification before displaying snapshot data
- **10.2** - Critical error logging if validation fails
- **10.3** - User-friendly error message display
- **10.4** - Prevent display of corrupted reports
- **10.5** - Admin notification for integrity failures
