# Snapshot Corruption Error Handling - Quick Reference

## At a Glance

**Purpose:** Detect and handle snapshot integrity validation failures for financial reports.

**Task:** 22. Add Snapshot Integrity Validation  
**Requirements:** 10.1, 10.2, 10.3, 10.4, 10.5

## Quick Import

```tsx
import { useSnapshotCorruptionError } from "@/hooks/use-snapshot-corruption-error";
import { SnapshotCorruptionErrorDialog } from "@/components/errors";
import { checkSnapshotCorruptionError } from "@/lib/snapshot-corruption-error";
```

## Basic Pattern

```tsx
const { handleError, showCorruptionDialog, setShowCorruptionDialog, corruptionError } = 
  useSnapshotCorruptionError();

// In error handler
useEffect(() => {
  if (error) handleError(error);
  if (report?.snapshotCorrupted) handleError(report);
}, [error, report, handleError]);

// In JSX
<SnapshotCorruptionErrorDialog
  open={showCorruptionDialog}
  onOpenChange={setShowCorruptionDialog}
  reportId={corruptionError.reportId}
  reportStatus={corruptionError.reportStatus}
/>
```

## API Reference

### Hook: useSnapshotCorruptionError

```typescript
const {
  handleError,           // (error: any) => boolean - Returns true if handled
  showCorruptionDialog,  // boolean - Dialog visibility state
  setShowCorruptionDialog, // (show: boolean) => void - Set dialog visibility
  corruptionError,       // SnapshotCorruptionError - Error details
  resetError,            // () => void - Reset error state
} = useSnapshotCorruptionError();
```

### Component: SnapshotCorruptionErrorDialog

```typescript
<SnapshotCorruptionErrorDialog
  open={boolean}                    // Required - Dialog visibility
  onOpenChange={(open) => void}     // Required - Visibility change handler
  reportId={number}                 // Optional - Report ID
  reportStatus={string}             // Optional - Report status
  onContactAdmin={() => void}       // Optional - Custom contact handler
/>
```

### Utility: checkSnapshotCorruptionError

```typescript
const result = checkSnapshotCorruptionError(error);
// Returns: {
//   isSnapshotCorrupted: boolean;
//   reportId?: number;
//   reportStatus?: string;
//   errorMessage?: string;
//   errorDetails?: string;
// }
```

## Error Detection

The system detects corruption in three ways:

1. **Error Code:** `error.response.data.error === "SNAPSHOT_CORRUPTED"`
2. **Error Message:** Contains "snapshot" and "corrupt" keywords
3. **Report Flag:** `report.snapshotCorrupted === true`

## Server Response Formats

### generateStatement Endpoint (Error)
```json
{
  "error": "SNAPSHOT_CORRUPTED",
  "message": "Snapshot integrity check failed. Report data may be corrupted.",
  "details": "The snapshot checksum does not match the stored value.",
  "reportId": 123,
  "reportStatus": "approved"
}
```

### getOne Endpoint (Flag)
```json
{
  "id": 123,
  "status": "approved",
  "snapshotCorrupted": true,
  "snapshotError": "Snapshot integrity check failed. Report data may be corrupted.",
  // ... other report fields
}
```

## Common Use Cases

### 1. Report Viewer
```tsx
useEffect(() => {
  if (error) handleError(error);
  if (report?.snapshotCorrupted) handleError(report);
}, [error, report, handleError]);
```

### 2. Statement Generator
```tsx
const mutation = useMutation({
  onError: (error) => {
    handleError(error) || toast.error("Failed");
  },
});
```

### 3. Report List
```tsx
reports?.forEach(report => {
  if (report.snapshotCorrupted) {
    // Show indicator or disable access
  }
});
```

## Styling

The dialog uses:
- Red theme for critical errors
- Security notice alert
- Report details in gray box
- Action guidance list
- Contact admin button (red)
- Close button (gray)

## Testing Checklist

- [ ] Simulate corruption in database
- [ ] Verify error dialog appears
- [ ] Check server logs for critical error
- [ ] Verify admin notification logged
- [ ] Test "Contact Administrator" button
- [ ] Verify report content not displayed
- [ ] Test with multiple reports
- [ ] Test custom contact handler

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dialog not showing | Check `handleError()` is called and dialog is rendered |
| Multiple dialogs | Use `resetError()` when closing dialog |
| False positives | Verify checksum computation is consistent |
| No admin notification | Check notification service configuration |

## File Locations

```
apps/
├── server/src/api/routes/financial-reports/
│   └── financial-reports.handlers.ts (validation logic)
└── client/
    ├── components/errors/
    │   ├── snapshot-corruption-error-dialog.tsx
    │   └── index.ts
    ├── hooks/
    │   └── use-snapshot-corruption-error.ts
    └── lib/
        └── snapshot-corruption-error.ts
```

## Documentation

- **Quick Start:** `SNAPSHOT_CORRUPTION_QUICK_START.md`
- **Full Guide:** `SNAPSHOT_CORRUPTION_ERROR_HANDLING.md`
- **Examples:** `snapshot-corruption-error-dialog.example.tsx`
- **Summary:** `TASK_22_IMPLEMENTATION_SUMMARY.md`

## Support

For detailed information, see the comprehensive documentation files in this directory.
